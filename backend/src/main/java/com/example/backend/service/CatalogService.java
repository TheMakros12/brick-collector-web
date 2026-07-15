package com.example.backend.service;

import com.example.backend.model.dto.LegoSetDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
    public List<LegoSetDTO> searchSets(String query) {
        // 1. Llamar a Rebrickable
        String rebrickableUrl = "https://rebrickable.com/api/v3/lego/sets/?page_size=20&ordering=-year";
        if (query != null && !query.isEmpty()) {
            rebrickableUrl += "&search=" + query;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "key " + rebrickableKey);
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(rebrickableUrl, HttpMethod.GET, entity, Map.class);
        
        List<LegoSetDTO> results = new ArrayList<>();
        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            List<Map<String, Object>> sets = (List<Map<String, Object>>) response.getBody().get("results");
            
            for (Map<String, Object> setMap : sets) {
                LegoSetDTO dto = new LegoSetDTO();
                String rawId = (String) setMap.get("set_num");
                dto.setSetId(rawId.split("-")[0]); // Quitamos el -1
                dto.setName((String) setMap.get("name"));
                dto.setYear((Integer) setMap.get("year"));
                dto.setNumParts((Integer) setMap.get("num_parts"));
                dto.setSetImgUrl((String) setMap.get("set_img_url"));
                
                // 2. Llamar a Brickset para el precio (Proxy real)
                dto.setEstimatedPrice(fetchPriceFromBrickset(dto.getSetId()));
                
                results.add(dto);
            }
        }
        return results;
    }

    /**
     * Llama a la API de Brickset usando nuestra Key protegida en el backend
     * para no sufrir problemas de CORS en el navegador web.
     */
    private Double fetchPriceFromBrickset(String setId) {
        try {
            String url = "https://brickset.com/api/v3.0/getSets?apiKey=" + bricksetKey + "&userHash=&params={\"setNumber\":\"" + setId + "-1\"}";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> sets = (List<Map<String, Object>>) response.getBody().get("sets");
                if (sets != null && !sets.isEmpty()) {
                    Map<String, Object> setInfo = sets.get(0);
                    Map<String, Object> legoCom = (Map<String, Object>) setInfo.get("LEGOCom");
                    if (legoCom != null) {
                        Map<String, Object> esPrice = (Map<String, Object>) legoCom.get("ES");
                        if (esPrice != null && esPrice.get("retailPrice") != null) {
                            // Convertir y devolver el precio oficial de España (Euros)
                            return Double.valueOf(esPrice.get("retailPrice").toString());
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching price from brickset for " + setId + ": " + e.getMessage());
        }
        return 0.0; // Fallback si no hay precio oficial
    }
}
