package com.example.backend.controller;

import com.example.backend.model.dto.LegoSetDTO;
import com.example.backend.service.CatalogService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST que expone los endpoints del Catálogo de Legos al Frontend.
 */
@RestController
@RequestMapping("/api/catalog")
@CrossOrigin(origins = "*") // Permite que nuestro frontend JavaScript consuma esta API
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * Endpoint para buscar sets.
     * Ejemplo de uso desde js/api.js: fetch('http://localhost:8080/api/catalog/search?q=porsche')
     */
    @GetMapping("/search")
    public List<LegoSetDTO> search(@RequestParam(required = false) String q) {
        return catalogService.searchSets(q);
    }

    @GetMapping("/details/{setId}")
    public LegoSetDTO getDetails(@PathVariable String setId) {
        return catalogService.getSetDetails(setId);
    }

    @GetMapping("/pieces/{setId}")
    public List<Map<String, Object>> getPieces(@PathVariable String setId) {
        return catalogService.getSetPieces(setId);
    }

    @GetMapping("/themes")
    public List<Map<String, Object>> getThemes() {
        return catalogService.getThemes();
    }
}
