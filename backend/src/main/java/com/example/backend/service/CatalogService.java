package com.example.backend.service;

import com.example.backend.model.dto.LegoSetDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Servicio centralizado ("El Motor") que hace el Proxy.
 * Recibe peticiones del frontend, busca en Rebrickable y saca el precio de Brickset.
 */
@Service
public class CatalogService {

    private final RestTemplate restTemplate;

    @Value("${api.rebrickable.key}")
    private String rebrickableKey;

    @Value("${api.brickset.key}")
    private String bricksetKey;

    public CatalogService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Busca sets en Rebrickable y luego obtiene sus precios en Brickset.
     */
    public List<LegoSetDTO> searchSets(String query, Integer themeId) {
        List<LegoSetDTO> results = new ArrayList<>();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        if (themeId != null) {
            // Rebrickable doesn't support multiple theme IDs in one request.
            // We must fetch them concurrently to keep it fast.
            List<Integer> themeIds = getThemeDescendants(themeId);
            ExecutorService executor = Executors.newFixedThreadPool(Math.min(themeIds.size(), 10)); // Max 10 concurrent to avoid 429
            
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
            // Normal search without category
            results.addAll(fetchSetsFromRebrickable(query, null, entity));
        }

        // 1. Filter sets with 0 parts if searching (to avoid stickers/books showing up)
        results = results.stream()
            .filter(dto -> dto.getNumParts() != null && dto.getNumParts() > 0)
            .collect(Collectors.toList());

        // 2. Sort by year descending
        results.sort(Comparator.comparing(LegoSetDTO::getYear, Comparator.nullsLast(Comparator.reverseOrder()))
                               .thenComparing(LegoSetDTO::getNumParts, Comparator.nullsLast(Comparator.reverseOrder())));

        // 3. Limit to top 20
        List<LegoSetDTO> topResults = results.stream().limit(20).collect(Collectors.toList());

        // 4. Fetch prices ONLY for the top 20
        for (LegoSetDTO dto : topResults) {
            Double price = fetchPriceFromBrickset(dto.getSetId());
            if (price == 0.0 && dto.getNumParts() != null) {
                price = Math.round(dto.getNumParts() * 0.105 * 100.0) / 100.0;
            }
            dto.setEstimatedPrice(price);
        }

        return topResults;
    }

    private List<LegoSetDTO> fetchSetsFromRebrickable(String query, Integer themeId, HttpEntity<String> entity) {
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/?page_size=20&ordering=-year";
        if (query != null && !query.isEmpty()) {
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
                    dto.setSetId(rawId.split("-")[0]);
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

    /**
     * Llama a la API de Brickset usando nuestra Key protegida en el backend
     * para no sufrir problemas de CORS en el navegador web.
     */
    private Double fetchPriceFromBrickset(String setId) {
        try {
            String url = "https://brickset.com/api/v3.asmx/getSets?apiKey={key}&userHash=&params={params}";
            ResponseEntity<Map> response = restTemplate.getForEntity(
                url, 
                Map.class, 
                bricksetKey, 
                "{\"setNumber\":\"" + setId + "-1\"}"
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> sets = (List<Map<String, Object>>) response.getBody().get("sets");
                if (sets != null && !sets.isEmpty()) {
                    Map<String, Object> setInfo = sets.get(0);
                    Map<String, Object> legoCom = (Map<String, Object>) setInfo.get("LEGOCom");
                    if (legoCom != null) {
                        String[] regions = {"ES", "DE", "FR", "US", "UK"};
                        for (String region : regions) {
                            Map<String, Object> regionPrice = (Map<String, Object>) legoCom.get(region);
                            if (regionPrice != null && regionPrice.get("retailPrice") != null) {
                                return Double.valueOf(regionPrice.get("retailPrice").toString());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching price from brickset for " + setId + ": " + e.getMessage());
        }
        return 0.0; // Fallback si no hay precio oficial
    }

    public LegoSetDTO getSetDetails(String setId) {
        String formattedId = setId.contains("-") ? setId : setId + "-1";
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/" + formattedId + "/";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> setMap = response.getBody();
                LegoSetDTO dto = new LegoSetDTO();
                String rawId = (String) setMap.get("set_num");
                dto.setSetId(rawId.split("-")[0]);
                dto.setName((String) setMap.get("name"));
                
                if (setMap.get("year") != null) dto.setYear(((Number) setMap.get("year")).intValue());
                if (setMap.get("num_parts") != null) dto.setNumParts(((Number) setMap.get("num_parts")).intValue());
                
                dto.setSetImgUrl((String) setMap.get("set_img_url"));
                dto.setSetUrl((String) setMap.get("set_url"));
                
                if (setMap.get("theme_id") != null) dto.setThemeId(((Number) setMap.get("theme_id")).intValue());
                
                Double price = fetchPriceFromBrickset(dto.getSetId());
                if (price == 0.0 && dto.getNumParts() != null) {
                    price = Math.round(dto.getNumParts() * 0.105 * 100.0) / 100.0;
                }
                dto.setEstimatedPrice(price);
                return dto;
            }
        } catch (Exception e) {
            System.err.println("Error fetching set details: " + e.getMessage());
        }
        return null;
    }

    public List<Map<String, Object>> getSetPieces(String setId) {
        String formattedId = setId.contains("-") ? setId : setId + "-1";
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/" + formattedId + "/parts/?page_size=100";
        
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
        if (cachedThemes != null) {
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
