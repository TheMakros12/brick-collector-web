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
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.Optional;

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
                dto.setRetailPrice(prices[0]);
                dto.setMarketValue(prices[1]); // current_value_new
            }, executorService);
            futures.add(future);
        }

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
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
        try {
            String url = "https://www.brickeconomy.com/api/v1/sets/" + setId + "?currency=EUR";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + brickEconomyKey);
            headers.set("x-api-key", brickEconomyKey); // Attempt both standard patterns
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> data = response.getBody();
                Double retail = 0.0;
                Double current = 0.0;
                if (data.get("retail_price_eu") != null) retail = ((Number) data.get("retail_price_eu")).doubleValue();
                if (data.get("current_value_new") != null) current = ((Number) data.get("current_value_new")).doubleValue();
                return new Double[]{retail, current};
            }
        } catch (Exception e) {
            System.err.println("Error fetching price from BrickEconomy for " + setId + ": " + e.getMessage());
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
                dto.setRetailPrice(prices[0]);
                dto.setMarketValue(prices[1]);

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
                    // Try fetching themes first
                    getThemes(); 
                    themeRepository.findById(dto.getThemeId()).ifPresent(set::setTheme);
                }
            }
            legoSetRepository.save(set);
        } else {
            // Update retail price if it was 0
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
        
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/themes/?page_size=1000";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                cachedThemes = (List<Map<String, Object>>) response.getBody().get("results");
                
                // Persist themes to DB
                for(Map<String, Object> tMap : cachedThemes) {
                    Integer id = ((Number) tMap.get("id")).intValue();
                    String name = (String) tMap.get("name");
                    Theme theme = new Theme();
                    theme.setId(id);
                    theme.setName(name);
                    themeRepository.save(theme);
                }
                
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
