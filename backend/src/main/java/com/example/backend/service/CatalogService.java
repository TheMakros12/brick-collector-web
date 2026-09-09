package com.example.backend.service;

import com.example.backend.model.dto.LegoSetDTO;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.Theme;
import com.example.backend.repository.LegoSetRepository;
import com.example.backend.repository.ThemeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;

@Service
public class CatalogService {

    private final RestTemplate restTemplate;
    private final ThemeRepository themeRepository;
    private final LegoSetRepository legoSetRepository;

    @Value("${api.rebrickable.key}")
    private String rebrickableKey;

    @Value("${api.brickeconomy.key:}")
    private String brickEconomyKey;

    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    public CatalogService(RestTemplate restTemplate, ThemeRepository themeRepository, LegoSetRepository legoSetRepository) {
        this.restTemplate = restTemplate;
        this.themeRepository = themeRepository;
        this.legoSetRepository = legoSetRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initThemesOnStartup() {
        try {
            if (themeRepository.count() == 0) {
                System.out.println("Inicializando catálogo de temas en la base de datos...");
                getThemes();
                System.out.println("Temas guardados correctamente en la base de datos. Total: " + themeRepository.count());
            }
        } catch (Exception e) {
            System.err.println("Aviso al inicializar temas en la BD: " + e.getMessage());
        }
    }

    public List<LegoSetDTO> searchSets(String query, Integer themeId) {
        List<LegoSetDTO> results = new ArrayList<>();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        if (themeId != null) {
            List<Integer> themeIds = getThemeDescendants(themeId);
            
            List<CompletableFuture<List<LegoSetDTO>>> futures = themeIds.stream()
                .map(tid -> CompletableFuture.supplyAsync(() -> fetchSetsFromRebrickable(query, tid, entity), executorService))
                .collect(Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            for (CompletableFuture<List<LegoSetDTO>> future : futures) {
                try {
                    List<LegoSetDTO> fetched = future.get();
                    if (fetched != null) {
                        results.addAll(fetched);
                    }
                } catch (Exception e) {
                    System.err.println("Error reading future: " + e.getMessage());
                }
            }
        } else {
            results.addAll(fetchSetsFromRebrickable(query, null, entity));
        }

        results = results.stream()
            .filter(dto -> dto.getNumParts() != null && dto.getNumParts() > 0)
            .collect(Collectors.toList());

        results.sort(Comparator.comparing(LegoSetDTO::getYear, Comparator.nullsLast(Comparator.reverseOrder()))
                               .thenComparing(LegoSetDTO::getNumParts, Comparator.nullsLast(Comparator.reverseOrder())));

        List<LegoSetDTO> topResults = results.stream().limit(20).collect(Collectors.toList());

        for (LegoSetDTO dto : topResults) {
            Optional<LegoSet> existing = legoSetRepository.findById(dto.getSetId());
            if (existing.isPresent()) {
                LegoSet set = existing.get();
                if (set.getRetailPrice() != null) {
                    dto.setRetailPrice(set.getRetailPrice());
                }
            }
        }

        return topResults;
    }



    private List<LegoSetDTO> fetchSetsFromRebrickable(String query, Integer themeId, HttpEntity<String> entity) {
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/?page_size=20&ordering=-year";
        if (query != null && !query.trim().isEmpty()) {
            rebrickableUrl += "&search=" + query;
        }
        if (themeId != null) {
            rebrickableUrl += "&theme_id=" + themeId;
        }

        List<LegoSetDTO> list = new ArrayList<>();
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> sets = (List<Map<String, Object>>) response.getBody().get("results");
                for (Map<String, Object> setMap : sets) {
                    LegoSetDTO dto = new LegoSetDTO();
                    String rawId = (String) setMap.get("set_num");
                    dto.setSetId(rawId);
                    dto.setName((String) setMap.get("name"));
                    if (setMap.get("year") != null) dto.setYear(((Number) setMap.get("year")).intValue());
                    if (setMap.get("num_parts") != null) dto.setNumParts(((Number) setMap.get("num_parts")).intValue());
                    dto.setSetImgUrl((String) setMap.get("set_img_url"));
                    dto.setSetUrl((String) setMap.get("set_url"));
                    if (setMap.get("theme_id") != null) dto.setThemeId(((Number) setMap.get("theme_id")).intValue());
                    list.add(dto);
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching sets from Rebrickable: " + e.getMessage());
        }
        return list;
    }

    public Double[] fetchPricesFromBrickEconomy(String setId) {
        String cleanId = (setId != null && !setId.contains("-")) ? setId + "-1" : setId;

        if (brickEconomyKey != null && !brickEconomyKey.isEmpty() && !brickEconomyKey.contains("replace-me")) {
            try {
                String url = "https://www.brickeconomy.com/api/v1/set/" + cleanId + "?currency=EUR";
                HttpHeaders headers = new HttpHeaders();
                headers.set("x-apikey", brickEconomyKey);
                headers.set("Accept", "application/json");
                headers.set("User-Agent", "BrickCollector/1.0 (Integration/API)");
                
                System.out.println("BrickEconomy API Call -> Endpoint: " + url + " | Set: " + cleanId + " | Currency: EUR");

                HttpEntity<String> entity = new HttpEntity<>(headers);
                
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                System.out.println("BrickEconomy API Response -> Status: " + response.getStatusCode().value());
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String bodyStr = response.getBody().trim();
                    System.out.println("BrickEconomy API Response Body -> " + bodyStr);
                    if (bodyStr.startsWith("{") || bodyStr.startsWith("[")) {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        Map<String, Object> body = mapper.readValue(bodyStr, Map.class);
                        Map<String, Object> dataMap = body;
                        if (body.get("data") instanceof Map) {
                            dataMap = (Map<String, Object>) body.get("data");
                        } else if (body.get("result") instanceof Map) {
                            dataMap = (Map<String, Object>) body.get("result");
                        }
                        
                        Double retailEu = null;
                        Double currentNew = null;
                        
                        if (dataMap.get("retail_price_eu") != null) {
                            retailEu = ((Number) dataMap.get("retail_price_eu")).doubleValue();
                        }
                        if (dataMap.get("current_value_new") != null) {
                            currentNew = ((Number) dataMap.get("current_value_new")).doubleValue();
                        }
                        
                        System.out.println("BrickEconomy API Success -> retail_price_eu: " + retailEu + " | current_value_new: " + currentNew);
                        return new Double[]{retailEu, currentNew};
                    }
                }
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                System.err.println("BrickEconomy API Error -> Status: " + e.getStatusCode() + " | Body: " + e.getResponseBodyAsString());
            } catch (Exception e) {
                System.err.println("BrickEconomy API Unexpected Error -> " + e.getMessage());
            }
        } else {
            System.err.println("BrickEconomy API Error -> API Key is missing or invalid");
        }

        return null;
    }

    public static class BrickEconomyDataDTO {
        private Double retailPriceEu;
        private Double currentValueNew;
        private Boolean retired;
        private List<Map<String, Object>> priceEventsNew;

        public Double getRetailPriceEu() { return retailPriceEu; }
        public void setRetailPriceEu(Double retailPriceEu) { this.retailPriceEu = retailPriceEu; }
        public Double getCurrentValueNew() { return currentValueNew; }
        public void setCurrentValueNew(Double currentValueNew) { this.currentValueNew = currentValueNew; }
        public Boolean getRetired() { return retired; }
        public void setRetired(Boolean retired) { this.retired = retired; }
        public List<Map<String, Object>> getPriceEventsNew() { return priceEventsNew; }
        public void setPriceEventsNew(List<Map<String, Object>> priceEventsNew) { this.priceEventsNew = priceEventsNew; }
    }

    public BrickEconomyDataDTO fetchFullBrickEconomyData(String setId) {
        String cleanId = (setId != null && !setId.contains("-")) ? setId + "-1" : setId;

        if (brickEconomyKey != null && !brickEconomyKey.isEmpty() && !brickEconomyKey.contains("replace-me")) {
            try {
                String url = "https://www.brickeconomy.com/api/v1/set/" + cleanId + "?currency=EUR";
                HttpHeaders headers = new HttpHeaders();
                headers.set("x-apikey", brickEconomyKey);
                headers.set("Accept", "application/json");
                headers.set("User-Agent", "BrickCollector/1.0 (Integration/API)");

                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String bodyStr = response.getBody().trim();
                    if (bodyStr.startsWith("{") || bodyStr.startsWith("[")) {
                        ObjectMapper mapper = new ObjectMapper();
                        Map<String, Object> body = mapper.readValue(bodyStr, Map.class);
                        Map<String, Object> dataMap = body;
                        if (body.get("data") instanceof Map) {
                            dataMap = (Map<String, Object>) body.get("data");
                        }

                        BrickEconomyDataDTO dto = new BrickEconomyDataDTO();
                        if (dataMap.get("retail_price_eu") != null) {
                            dto.setRetailPriceEu(((Number) dataMap.get("retail_price_eu")).doubleValue());
                        }
                        if (dataMap.get("current_value_new") != null) {
                            dto.setCurrentValueNew(((Number) dataMap.get("current_value_new")).doubleValue());
                        }
                        if (dataMap.get("retired") != null) {
                            dto.setRetired((Boolean) dataMap.get("retired"));
                        }
                        if (dataMap.get("price_events_new") instanceof List) {
                            dto.setPriceEventsNew((List<Map<String, Object>>) dataMap.get("price_events_new"));
                        }
                        return dto;
                    }
                }
            } catch (Exception e) {
                System.err.println("Error fetching full BrickEconomy data: " + e.getMessage());
            }
        }
        return null;
    }

    public LegoSetDTO getSetDetails(String setId) {
        if (setId != null && !setId.contains("-")) {
            setId = setId + "-1";
        }

        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/" + setId + "/";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> httpEntity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, httpEntity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> setMap = response.getBody();
                LegoSetDTO dto = new LegoSetDTO();
                String rawId = (String) setMap.get("set_num");
                dto.setSetId(rawId);
                dto.setName((String) setMap.get("name"));
                
                if (setMap.get("year") != null) dto.setYear(((Number) setMap.get("year")).intValue());
                if (setMap.get("num_parts") != null) dto.setNumParts(((Number) setMap.get("num_parts")).intValue());
                
                dto.setSetImgUrl((String) setMap.get("set_img_url"));
                dto.setSetUrl((String) setMap.get("set_url"));
                if (setMap.get("theme_id") != null) dto.setThemeId(((Number) setMap.get("theme_id")).intValue());
                
                Double[] prices = fetchPricesFromBrickEconomy(dto.getSetId());
                if (prices != null) {
                    dto.setRetailPrice(prices[0]);
                    dto.setMarketValue(prices[1]);
                }

                return dto;
            }
        } catch (Exception e) {
            System.err.println("Error fetching set details: " + e.getMessage());
        }
        return null;
    }



    public Theme getThemeEntity(Integer themeId) {
        if (themeId == null) return null;
        java.util.Optional<com.example.backend.model.entity.Theme> theme = themeRepository.findById(themeId);
        if (theme.isPresent()) {
            return theme.get();
        }
        
        System.out.println("Theme " + themeId + " no encontrado localmente. Sincronizando desde Rebrickable...");
        getThemes();
        
        return themeRepository.findById(themeId).orElseThrow(() -> 
            new IllegalArgumentException("El tema " + themeId + " no existe en Rebrickable y no se puede guardar."));
    }

    public List<Map<String, Object>> getSetPieces(String setId) {
        if (setId != null && !setId.contains("-")) {
            setId = setId + "-1";
        }
        List<Map<String, Object>> allPieces = new ArrayList<>();
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/" + setId + "/parts/?page_size=1000";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        try {
            while (rebrickableUrl != null) {
                ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("results");
                    if (results != null) {
                        allPieces.addAll(results);
                    }
                    rebrickableUrl = (String) response.getBody().get("next");
                } else {
                    break;
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching set pieces: " + e.getMessage());
        }
        return allPieces;
    }

    private List<Map<String, Object>> cachedThemes = null;

    public List<Map<String, Object>> getThemes() {
        if (cachedThemes != null && !cachedThemes.isEmpty()) {
            return cachedThemes;
        }

        if (themeRepository.count() > 0) {
            List<Theme> dbThemes = themeRepository.findAll();
            
            boolean isMigrated = dbThemes.stream().anyMatch(t -> t.getParentId() != null);
            
            if (isMigrated) {
                List<Map<String, Object>> list = new ArrayList<>();
                for (Theme t : dbThemes) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", t.getId());
                    m.put("name", t.getName());
                    m.put("parent_id", t.getParentId());
                    list.add(m);
                }
                cachedThemes = list;
                return cachedThemes;
            } else {
                System.out.println("Migración requerida: La tabla Theme no tiene parent_id. Forzando sincronización con Rebrickable...");
            }
        }
        
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/themes/?page_size=1000";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                cachedThemes = (List<Map<String, Object>>) response.getBody().get("results");
                
                List<Theme> toSave = new ArrayList<>();
                for(Map<String, Object> tMap : cachedThemes) {
                    Integer id = ((Number) tMap.get("id")).intValue();
                    String name = (String) tMap.get("name");
                    Integer parentId = tMap.get("parent_id") != null ? ((Number) tMap.get("parent_id")).intValue() : null;
                    Theme theme = new Theme();
                    theme.setId(id);
                    theme.setName(name);
                    theme.setParentId(parentId);
                    toSave.add(theme);
                }
                themeRepository.saveAll(toSave);
                
                return cachedThemes;
            }
        } catch (Exception e) {
            System.err.println("Error fetching themes: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    private List<Integer> getThemeDescendants(Integer rootThemeId) {
        List<Map<String, Object>> allThemes = getThemes();
        List<Integer> result = new ArrayList<>();
        if (rootThemeId == null) return result;
        
        result.add(rootThemeId);
        
        boolean added;
        do {
            added = false;
            for (Map<String, Object> theme : allThemes) {
                Integer id = ((Number) theme.get("id")).intValue();
                Integer parentId = theme.get("parent_id") != null ? ((Number) theme.get("parent_id")).intValue() : null;
                
                if (parentId != null && result.contains(parentId) && !result.contains(id)) {
                    result.add(id);
                    added = true;
                }
            }
        } while (added);
        
        return result;
    }
}
