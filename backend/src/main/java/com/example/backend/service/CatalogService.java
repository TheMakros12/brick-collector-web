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
    private final LegoSetRepository legoSetRepository;
    private final ThemeRepository themeRepository;

    @Value("${api.rebrickable.key}")
    private String rebrickableKey;

    @Value("${api.brickeconomy.key}")
    private String brickEconomyKey;

    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    public CatalogService(RestTemplate restTemplate, LegoSetRepository legoSetRepository, ThemeRepository themeRepository) {
        this.restTemplate = restTemplate;
        this.legoSetRepository = legoSetRepository;
        this.themeRepository = themeRepository;
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
            ExecutorService executor = Executors.newFixedThreadPool(Math.min(themeIds.size(), 10));
            
            List<CompletableFuture<List<LegoSetDTO>>> futures = themeIds.stream()
                .map(tid -> CompletableFuture.supplyAsync(() -> fetchSetsFromRebrickable(query, tid, entity), executor))
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
            executor.shutdown();
        } else {
            results.addAll(fetchSetsFromRebrickable(query, null, entity));
        }

        results = results.stream()
            .filter(dto -> dto.getNumParts() != null && dto.getNumParts() > 0)
            .collect(Collectors.toList());

        results.sort(Comparator.comparing(LegoSetDTO::getYear, Comparator.nullsLast(Comparator.reverseOrder()))
                               .thenComparing(LegoSetDTO::getNumParts, Comparator.nullsLast(Comparator.reverseOrder())));

        List<LegoSetDTO> topResults = results.stream().limit(20).collect(Collectors.toList());

        List<CompletableFuture<Void>> futures = new ArrayList<>();
        for (LegoSetDTO dto : topResults) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                Double[] prices = fetchPricesFromBrickEconomy(dto.getSetId());
                Double retail = prices[0];
                Double market = prices[1];

                if ((retail == null || retail == 0.0) && dto.getNumParts() != null && dto.getNumParts() > 0) {
                    retail = estimateRetailPrice(dto.getNumParts());
                }
                if (market == null || market == 0.0) {
                    market = retail;
                }

                dto.setRetailPrice(retail);
                dto.setMarketValue(market);
            }, executorService);
            futures.add(future);
        }

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        return topResults;
    }

    private Double estimateRetailPrice(Integer numParts) {
        if (numParts == null || numParts <= 0) return 19.99;
        double raw = numParts * 0.10;
        if (raw < 9.99) return 9.99;
        return Math.floor(raw) + 0.99;
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
                    saveSetToDb(dto);
                    list.add(dto);
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching sets from Rebrickable: " + e.getMessage());
        }
        return list;
    }

    public Double[] fetchPricesFromBrickEconomy(String setId) {
        Double retail = 0.0;
        Double current = 0.0;
        String cleanId = (setId != null && !setId.contains("-")) ? setId + "-1" : setId;

        if (brickEconomyKey != null && !brickEconomyKey.isEmpty() && !brickEconomyKey.contains("replace-me")) {
            try {
                String url = "https://www.brickeconomy.com/api/v1/sets/" + cleanId + "?currency=EUR";
                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + brickEconomyKey);
                headers.set("x-api-key", brickEconomyKey);
                headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                headers.set("Accept", "application/json, text/html, */*");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                
                System.out.println("Llamando a API BrickEconomy para " + cleanId + " con clave: " + 
                    (brickEconomyKey.length() > 4 ? brickEconomyKey.substring(0, 4) + "****" : "****"));

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String bodyStr = response.getBody().trim();
                    if (bodyStr.startsWith("{") || bodyStr.startsWith("[")) {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        Map<String, Object> body = mapper.readValue(bodyStr, Map.class);
                        Map<String, Object> data = body;
                        if (body.get("data") instanceof Map) {
                            data = (Map<String, Object>) body.get("data");
                        } else if (body.get("result") instanceof Map) {
                            data = (Map<String, Object>) body.get("result");
                        }
                        
                        if (data.get("retail_price_eu") != null) retail = ((Number) data.get("retail_price_eu")).doubleValue();
                        else if (data.get("retail_price_us") != null) retail = ((Number) data.get("retail_price_us")).doubleValue();
                        else if (data.get("retail_price") != null) retail = ((Number) data.get("retail_price")).doubleValue();
                        else if (data.get("retailPrice") != null) retail = ((Number) data.get("retailPrice")).doubleValue();
                        
                        if (data.get("current_value_new") != null) current = ((Number) data.get("current_value_new")).doubleValue();
                        else if (data.get("market_value") != null) current = ((Number) data.get("market_value")).doubleValue();
                        else if (data.get("current_value") != null) current = ((Number) data.get("current_value")).doubleValue();
                        
                        if (retail > 0) {
                            System.out.println("BrickEconomy API OK para " + cleanId + ": MSRP=" + retail + "€, Valor=" + current + "€");
                            return new Double[]{retail, current};
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Aviso API BrickEconomy para " + cleanId + ": " + e.getMessage());
            }
        }

        // Web scraping fallback directly from BrickEconomy public pages
        Double[] webPrices = scrapePricesFromBrickEconomy(cleanId);
        if (webPrices[0] > 0) {
            return webPrices;
        }

        return new Double[]{0.0, 0.0};
    }

    private Double[] scrapePricesFromBrickEconomy(String setId) {
        try {
            String cleanId = setId.contains("-") ? setId : setId + "-1";
            String webUrl = "https://www.brickeconomy.com/set/" + cleanId + "/";
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(webUrl, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String html = response.getBody();
                Double retail = 0.0;
                Double market = 0.0;
                
                java.util.regex.Pattern pRetail = java.util.regex.Pattern.compile("(?:available at retail for|retail for|retail price of|retail of|MSRP:?\\s*)[^0-9]{1,10}([0-9]+(?:\\.[0-9]{1,2})?)", java.util.regex.Pattern.CASE_INSENSITIVE);
                java.util.regex.Matcher mRetail = pRetail.matcher(html);
                if (mRetail.find()) {
                    retail = Double.parseDouble(mRetail.group(1));
                }

                java.util.regex.Pattern pMarket = java.util.regex.Pattern.compile("(?:average below MSRP at|current value|market value|value:?\\s*)[^0-9]{1,10}([0-9]+(?:\\.[0-9]{1,2})?)", java.util.regex.Pattern.CASE_INSENSITIVE);
                java.util.regex.Matcher mMarket = pMarket.matcher(html);
                if (mMarket.find()) {
                    market = Double.parseDouble(mMarket.group(1));
                }

                if (market == 0.0) market = retail;
                System.out.println("BrickEconomy Web Scrape OK para " + cleanId + ": MSRP=" + retail + "€, Valor=" + market + "€");
                return new Double[]{retail, market};
            }
        } catch (Exception e) {
            System.err.println("Aviso Web Scraper BrickEconomy para " + setId + ": " + e.getMessage());
        }
        return new Double[]{0.0, 0.0};
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
                Double retail = prices[0];
                Double market = prices[1];

                if ((retail == null || retail == 0.0) && dto.getNumParts() != null && dto.getNumParts() > 0) {
                    retail = estimateRetailPrice(dto.getNumParts());
                }
                if (market == null || market == 0.0) {
                    market = retail;
                }

                dto.setRetailPrice(retail);
                dto.setMarketValue(market);

                // Ensure it exists in the sets table so it can be linked to Collection/Wishlist
                saveSetToDb(dto);

                return dto;
            }
        } catch (Exception e) {
            System.err.println("Error fetching set details: " + e.getMessage());
        }
        return null;
    }

    private void saveSetToDb(LegoSetDTO dto) {
        Optional<LegoSet> existing = legoSetRepository.findById(dto.getSetId());
        if (existing.isEmpty()) {
            LegoSet set = new LegoSet();
            set.setId(dto.getSetId());
            set.setName(dto.getName());
            set.setPieces(dto.getNumParts());
            set.setImageUrl(dto.getSetImgUrl());
            if (dto.getYear() != null) {
                set.setReleaseDate(LocalDate.of(dto.getYear(), 1, 1));
            }
            set.setRetailPrice(dto.getRetailPrice());
            set.setRetired(false); // Default

            if (dto.getThemeId() != null) {
                Optional<Theme> theme = themeRepository.findById(dto.getThemeId());
                if (theme.isPresent()) {
                    set.setTheme(theme.get());
                } else {
                    getThemes(); 
                    Optional<Theme> reloaded = themeRepository.findById(dto.getThemeId());
                    if (reloaded.isPresent()) {
                        set.setTheme(reloaded.get());
                    } else {
                        Theme fallbackTheme = new Theme();
                        fallbackTheme.setId(dto.getThemeId());
                        fallbackTheme.setName("Tema " + dto.getThemeId());
                        set.setTheme(themeRepository.save(fallbackTheme));
                    }
                }
            }
            legoSetRepository.save(set);
        } else {
            LegoSet set = existing.get();
            if ((set.getRetailPrice() == null || set.getRetailPrice() == 0.0) && dto.getRetailPrice() != null && dto.getRetailPrice() > 0) {
                set.setRetailPrice(dto.getRetailPrice());
                legoSetRepository.save(set);
            }
        }
    }

    public List<Map<String, Object>> getSetPieces(String setId) {
        if (setId != null && !setId.contains("-")) {
            setId = setId + "-1";
        }
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/" + setId + "/parts/?page_size=100";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (List<Map<String, Object>>) response.getBody().get("results");
            }
        } catch (Exception e) {
            System.err.println("Error fetching set pieces: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    private List<Map<String, Object>> cachedThemes = null;

    public List<Map<String, Object>> getThemes() {
        if (cachedThemes != null && !cachedThemes.isEmpty()) {
            return cachedThemes;
        }

        if (themeRepository.count() > 0) {
            List<Theme> dbThemes = themeRepository.findAll();
            List<Map<String, Object>> list = new ArrayList<>();
            for (Theme t : dbThemes) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", t.getId());
                m.put("name", t.getName());
                list.add(m);
            }
            cachedThemes = list;
            return cachedThemes;
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
                    Theme theme = new Theme();
                    theme.setId(id);
                    theme.setName(name);
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
