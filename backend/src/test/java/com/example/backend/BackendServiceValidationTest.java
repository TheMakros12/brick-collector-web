package com.example.backend;

import com.example.backend.model.dto.LegoSetDTO;
import com.example.backend.model.dto.ListItemDTO;
import com.example.backend.model.entity.*;
import com.example.backend.repository.*;
import com.example.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BackendServiceValidationTest {

    @Mock
    private CollectionRepository collectionRepository;

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private LegoSetRepository legoSetRepository;

    @Mock
    private PriceHistoryRepository priceHistoryRepository;

    @Mock
    private ThemeRepository themeRepository;

    @Mock
    private CatalogService catalogService;

    @InjectMocks
    private CollectionService collectionService;

    private WishlistService wishlistService;
    private PriceUpdateScheduler priceUpdateScheduler;

    private LegoSet sampleSet1;
    private LegoSet sampleSet2;
    private Theme sampleTheme;

    @BeforeEach
    void setUp() {
        wishlistService = new WishlistService(wishlistRepository, legoSetRepository, catalogService, collectionService);
        priceUpdateScheduler = new PriceUpdateScheduler(collectionRepository, priceHistoryRepository, catalogService);

        sampleTheme = new Theme();
        sampleTheme.setId(601);
        sampleTheme.setName("Speed Champions");

        sampleSet1 = new LegoSet();
        sampleSet1.setId("42172-1");
        sampleSet1.setName("Porsche 911 GT3 RS");
        sampleSet1.setPieces(1471);
        sampleSet1.setReleaseDate(LocalDate.of(2023, 1, 1));
        sampleSet1.setRetailPrice(199.99);
        sampleSet1.setTheme(sampleTheme);

        sampleSet2 = new LegoSet();
        sampleSet2.setId("71049-2");
        sampleSet2.setName("F1 Race Car Variant");
        sampleSet2.setPieces(250);
        sampleSet2.setReleaseDate(LocalDate.of(2024, 1, 1));
        sampleSet2.setRetailPrice(29.99);
        sampleSet2.setTheme(sampleTheme);
    }

    @Test
    @DisplayName("1. Catalog / Rebrickable: Full IDs with suffix preserved (e.g., 42172-1)")
    void testSetIdSuffixPreserved() {
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.of(sampleSet1));
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 245.00});
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> {
            Collection c = i.getArgument(0);
            c.setId(1L);
            return c;
        });

        ListItemDTO dto = collectionService.addSetToCollection("42172");
        assertNotNull(dto);
        assertEquals("42172-1", dto.getLegoSet().getSetId());
        assertEquals("Porsche 911 GT3 RS", dto.getLegoSet().getName());
        assertEquals(1471, dto.getLegoSet().getNumParts());
    }

    @Test
    @DisplayName("2. BrickEconomy: Differentiates retail_price, market_value, and purchase_price")
    void testBrickEconomyPriceSeparation() {
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("42172-1"))
                .thenReturn(Optional.of(createPriceHistory(sampleSet1, 245.00)));

        LegoSetDTO dto = collectionService.mapSetToDTO(sampleSet1);

        assertEquals(199.99, dto.getRetailPrice(), "retailPrice should be MSRP");
        assertEquals(245.00, dto.getMarketValue(), "marketValue should be current_value_new from price_history");
    }

    @Test
    @DisplayName("3. Wishlist: Add to Wishlist DOES NOT create price_history")
    void testAddToWishlistNoPriceHistory() {
        when(legoSetRepository.findById("71049-2")).thenReturn(Optional.of(sampleSet2));
        when(wishlistRepository.findByLegoSetId("71049-2")).thenReturn(Optional.empty());
        when(wishlistRepository.save(any(Wishlist.class))).thenAnswer(i -> {
            Wishlist w = i.getArgument(0);
            w.setId(10L);
            return w;
        });

        ListItemDTO dto = wishlistService.addSetToWishlist("71049-2");
        assertNotNull(dto);
        assertEquals("71049-2", dto.getLegoSet().getSetId());

        verify(priceHistoryRepository, never()).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("4. Collection: Handles acquisition types (PURCHASED, PARTIAL, GIFT)")
    void testAcquisitionTypes() {
        Collection colItem = new Collection();
        colItem.setId(1L);
        colItem.setLegoSet(sampleSet1);
        colItem.setAcquisitionType(Collection.AcquisitionType.GIFT);
        colItem.setPurchasePrice(0.0);

        when(collectionRepository.findById(1L)).thenReturn(Optional.of(colItem));
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> i.getArgument(0));

        ListItemDTO dtoG = collectionService.updateSet(1L, 0.0, 2024, "GIFT");
        assertEquals("GIFT", dtoG.getAcquisitionType());
        assertEquals(0.0, dtoG.getPurchasePrice());

        ListItemDTO dtoP = collectionService.updateSet(1L, 75.00, 2024, "PARTIAL");
        assertEquals("PARTIAL", dtoP.getAcquisitionType());
        assertEquals(75.00, dtoP.getPurchasePrice());
    }

    @Test
    @DisplayName("5. Price History: Collection insertion generates initial snapshot")
    void testCollectionInsertionGeneratesPriceHistory() {
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.of(sampleSet1));
        when(collectionRepository.findByLegoSetId("42172-1")).thenReturn(Optional.empty());
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 250.00});
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> {
            Collection c = i.getArgument(0);
            c.setId(1L);
            return c;
        });

        collectionService.addSetToCollection("42172-1");

        verify(priceHistoryRepository, times(1)).save(argThat(ph -> 
            ph.getLegoSet().getId().equals("42172-1") && ph.getPrice().equals(250.00)
        ));
    }

    @Test
    @DisplayName("6. Wishlist -> Collection Migration: Moves set, deletes wishlist, generates initial price_history")
    void testWishlistToCollectionMigration() {
        Wishlist wItem = new Wishlist();
        wItem.setId(5L);
        wItem.setLegoSet(sampleSet1);

        when(wishlistRepository.findById(5L)).thenReturn(Optional.of(wItem));
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.of(sampleSet1));
        when(collectionRepository.findByLegoSetId("42172-1")).thenReturn(Optional.empty());
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 250.00});
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> {
            Collection c = i.getArgument(0);
            c.setId(1L);
            return c;
        });
        when(wishlistRepository.findByLegoSetId("42172-1")).thenReturn(Optional.of(wItem));

        ListItemDTO moved = wishlistService.moveToCollection(5L);
        assertNotNull(moved);

        verify(wishlistRepository, times(1)).delete(wItem);
        verify(priceHistoryRepository, times(1)).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("8. Requirement #8: Deleting from Collection DOES NOT delete price_history")
    void testDeleteCollectionPreservesPriceHistory() {
        collectionService.removeItem(1L);

        verify(collectionRepository, times(1)).deleteById(1L);
        verify(priceHistoryRepository, never()).deleteById(anyLong());
        verify(priceHistoryRepository, never()).delete(any(PriceHistory.class));
        verify(legoSetRepository, never()).delete(any(LegoSet.class));
    }

    @Test
    @DisplayName("9. Scheduler: Updates only Collection sets and avoids redundant duplicate snapshots")
    void testSchedulerUpdatesOnlyChangedPrices() {
        Collection colItem = new Collection();
        colItem.setId(1L);
        colItem.setLegoSet(sampleSet1);

        when(collectionRepository.findAll()).thenReturn(List.of(colItem));
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 250.00});
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("42172-1"))
                .thenReturn(Optional.of(createPriceHistory(sampleSet1, 250.00)));

        priceUpdateScheduler.updatePrices();

        // No new entry created since price is unchanged (250.00 == 250.00)
        verify(priceHistoryRepository, never()).save(any(PriceHistory.class));

        // When price changes to 260.00
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 260.00});
        priceUpdateScheduler.updatePrices();

        verify(priceHistoryRepository, times(1)).save(argThat(ph -> ph.getPrice().equals(260.00)));
    }

    private PriceHistory createPriceHistory(LegoSet set, Double price) {
        PriceHistory ph = new PriceHistory();
        ph.setLegoSet(set);
        ph.setPrice(price);
        return ph;
    }
}
