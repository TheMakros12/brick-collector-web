package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.backend.model.dto.LegoSetDTO;
import com.example.backend.model.dto.ListItemDTO;
import com.example.backend.service.CatalogService;
import com.example.backend.service.CollectionService;
import com.example.backend.service.PriceUpdateScheduler;
import com.example.backend.service.WishlistService;

import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Disabled;
import org.springframework.test.context.ActiveProfiles;

import com.example.backend.model.entity.*;
import com.example.backend.repository.*;

@SpringBootTest
@ActiveProfiles("local")
@Disabled("Script de prueba de integración manual de extremo a extremo")
public class FunctionalValidationTest {

    @Autowired
    private CatalogService catalogService;
    
    @Autowired
    private WishlistService wishlistService;
    
    @Autowired
    private CollectionService collectionService;

    @Autowired
    private PriceUpdateScheduler priceUpdateScheduler;

    @Autowired
    private CollectionRepository collectionRepository;

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private PriceHistoryRepository priceHistoryRepository;

    @Autowired
    private LegoSetRepository legoSetRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long count(String table) {
        try {
            if ("lego_set".equalsIgnoreCase(table)) return legoSetRepository.count();
            if ("collection".equalsIgnoreCase(table)) return collectionRepository.count();
            if ("wishlist".equalsIgnoreCase(table)) return wishlistRepository.count();
            if ("price_history".equalsIgnoreCase(table)) return priceHistoryRepository.count();
        } catch (Exception e) {
            return 0L;
        }
        return 0L;
    }

    private void clearAllData() {
        try { collectionRepository.deleteAll(); } catch (Exception ignored) {}
        try { wishlistRepository.deleteAll(); } catch (Exception ignored) {}
        try { priceHistoryRepository.deleteAll(); } catch (Exception ignored) {}
        try { legoSetRepository.deleteAll(); } catch (Exception ignored) {}
    }

    @Test
    public void runFullEndToEndValidation() {
        System.out.println("\n\n=== INICIANDO VALIDACIÓN FUNCIONAL DE EXTREMO A EXTREMO ===\n");
        String setId = "10330-1"; // Set real (McLaren MP4/4)

        try {
            // 0. Ensure clean state
            clearAllData();

            long initialLegoSet = count("lego_set");
            long initialPriceHistory = count("price_history");

            System.out.println("Estado inicial: lego_set=" + initialLegoSet + ", price_history=" + initialPriceHistory);

            // 1 & 2. Catalog Search
            System.out.println("\n[Prueba 2] Ejecutando B?squeda (Search) para query '10330'...");
            List<LegoSetDTO> searchResults = catalogService.searchSets("10330", null);
            assertFalse(searchResults.isEmpty(), "No se encontraron resultados");
            LegoSetDTO searchDto = searchResults.get(0);
            System.out.println("Search Result -> PVP: " + searchDto.getRetailPrice() + " | Market Value: " + searchDto.getMarketValue());
            
            assertEquals(initialLegoSet, count("lego_set"), "Search no debe insertar en lego_set");
            assertEquals(initialPriceHistory, count("price_history"), "Search no debe insertar en price_history");
            System.out.println("[OK] Search superado.");

            // 3. Catalog Detail
            System.out.println("\n[Prueba 3] Consultando Detalle (Details) de " + setId + "...");
            LegoSetDTO detailDto = catalogService.getSetDetails(setId);
            assertNotNull(detailDto, "Detail fall?");
            System.out.println("Detail Result -> PVP: " + detailDto.getRetailPrice() + " | Market Value: " + detailDto.getMarketValue());
            
            assertEquals(initialLegoSet, count("lego_set"), "Detail no debe insertar en lego_set");
            assertEquals(initialPriceHistory, count("price_history"), "Detail no debe insertar en price_history");
            System.out.println("[OK] Detail superado.");

            // 4. Wishlist
            System.out.println("\n[Prueba 4] A?adiendo " + setId + " a Wishlist...");
            ListItemDTO wishlistItem = wishlistService.addSetToWishlist(setId);
            assertNotNull(wishlistItem, "Wishlist Add fall?");
            Long wishlistItemId = wishlistItem.getId();
            
            assertEquals(initialLegoSet + 1, count("lego_set"), "Wishlist debe crear 1 lego_set");
            assertEquals(1, count("wishlist"), "Wishlist debe tener 1 registro");
            assertEquals(0, count("collection"), "Collection debe tener 0 registros");
            assertEquals(initialPriceHistory, count("price_history"), "Wishlist NO debe crear price_history");
            System.out.println("[OK] Wishlist Add superado.");

            // 6. Wishlist -> Collection
            System.out.println("\n[Prueba 6] Moviendo " + setId + " de Wishlist a Collection...");
            ListItemDTO collectionItem = wishlistService.moveToCollection(wishlistItemId);
            assertNotNull(collectionItem, "Move to Collection fall?");
            Long collectionItemId = collectionItem.getId();
            
            assertEquals(initialLegoSet + 1, count("lego_set"), "Move NO debe crear lego_set duplicado");
            assertEquals(0, count("wishlist"), "Wishlist debe eliminarse");
            assertEquals(1, count("collection"), "Collection debe crearse");
            assertEquals(initialPriceHistory + 1, count("price_history"), "Move debe crear el primer snapshot price_history");

            Collection colRow = collectionRepository.findAll().stream().findFirst().orElse(null);
            System.out.println("Collection insertada con purchase_price = " + (colRow != null ? colRow.getPurchasePrice() : "null"));
            PriceHistory phRow = priceHistoryRepository.findAll().stream().findFirst().orElse(null);
            System.out.println("Price_history insertada con price = " + (phRow != null ? phRow.getPrice() : "null"));

            System.out.println("[OK] Wishlist -> Collection superado.");

            // 8. Scheduler (Sin cambio)
            System.out.println("\n[Prueba 8A] Ejecutando Scheduler (Sin Cambio)...");
            long historyCountBefore = count("price_history");
            priceUpdateScheduler.updatePrices();
            assertEquals(historyCountBefore, count("price_history"), "El scheduler NO debe crear snapshots si el precio es igual");
            System.out.println("[OK] Scheduler Sin Cambio superado.");

            // 8. Scheduler (Con cambio forzado en BD)
            System.out.println("\n[Prueba 8B] Ejecutando Scheduler (Forzando cambio de precio)...");
            List<com.example.backend.model.entity.PriceHistory> allPh = priceHistoryRepository.findAll();
            allPh.forEach(ph -> ph.setPrice(10.00));
            priceHistoryRepository.saveAll(allPh);
            priceUpdateScheduler.updatePrices();
            assertEquals(historyCountBefore + 1, count("price_history"), "El scheduler DEBE crear un snapshot si el precio cambia");
            System.out.println("[OK] Scheduler Con Cambio superado.");

            // 7. Eliminar Collection
            System.out.println("\n[Prueba 7] Eliminando de Collection...");
            collectionService.removeItem(collectionItemId);
            
            assertEquals(0, count("collection"), "Collection debe eliminarse");
            assertEquals(initialLegoSet + 1, count("lego_set"), "El lego_set debe permanecer");
            assertEquals(historyCountBefore + 1, count("price_history"), "El historial de precios debe permanecer");
            System.out.println("[OK] Eliminar Collection superado.");

            // 5. Collection Directa
            System.out.println("\n[Prueba 5] Añadiendo " + setId + " DIRECTAMENTE a Collection...");
            priceHistoryRepository.deleteAll(); // Reset history to test initial snapshot creation
            ListItemDTO directColRes = collectionService.addSetToCollection(setId);
            assertNotNull(directColRes, "Collection Add fall?");
            
            assertEquals(1, count("collection"), "Collection debe tener 1 registro");
            assertEquals(1, count("price_history"), "Collection directa DEBE crear un primer snapshot");
            System.out.println("[OK] A?adir Directo a Collection superado.");

            System.out.println("\n=== VALIDACI?N COMPLETADA EXITOSAMENTE ===");

        } catch (Exception e) {
            System.err.println("\n[!!!] PRUEBA FALLIDA [!!!]");
            e.printStackTrace();
            fail("Validacion fallida: " + e.getMessage());
        } finally {
            // Clean up test data
            clearAllData();
        }
    }
}
