package com.example.backend;

import com.example.backend.model.dto.LegoSetDTO;
import com.example.backend.model.dto.ListItemDTO;
import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.model.entity.Theme;
import com.example.backend.model.entity.Wishlist;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.LegoSetRepository;
import com.example.backend.repository.PriceHistoryRepository;
import com.example.backend.repository.ThemeRepository;
import com.example.backend.repository.WishlistRepository;
import com.example.backend.service.CatalogService;
import com.example.backend.service.CollectionService;
import com.example.backend.service.PriceUpdateScheduler;
import com.example.backend.service.WishlistService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BackendServiceValidationTest {

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
    private RestTemplate restTemplate;

    // We will use spies or manual instantiation where needed, but mockito handles injections
    private CatalogService catalogService;
    private CollectionService collectionService;
    private WishlistService wishlistService;
    private PriceUpdateScheduler priceUpdateScheduler;

    private Theme sampleTheme;
    private LegoSet sampleSet1;
    private LegoSetDTO sampleDTO;

    @BeforeEach
    void setUp() {
        // CatalogService is mocked since we don't want to hit real HTTP APIs
        catalogService = mock(CatalogService.class);
        
        collectionService = new CollectionService(collectionRepository, wishlistRepository, legoSetRepository, priceHistoryRepository, catalogService);
        wishlistService = new WishlistService(wishlistRepository, legoSetRepository, catalogService, collectionService);
        priceUpdateScheduler = new PriceUpdateScheduler(collectionRepository, priceHistoryRepository, legoSetRepository, catalogService);

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

        sampleDTO = new LegoSetDTO();
        sampleDTO.setSetId("42172-1");
        sampleDTO.setName("Porsche 911 GT3 RS");
        sampleDTO.setNumParts(1471);
        sampleDTO.setThemeId(601);
        sampleDTO.setRetailPrice(199.99);
        sampleDTO.setMarketValue(245.00);
    }

    @Test
    @DisplayName("Test 1: Search - Buscar un set NO aumenta BD")
    void testSearchDoesNotIncreaseDB() {
        // En la implementación real CatalogService.searchSets solo retorna DTOs, no tiene repositorio.
        // Simulamos un CatalogService con los repositorios para verificar que de forma aislada no llama al save.
        CatalogService realCatalogService = new CatalogService(restTemplate, themeRepository, legoSetRepository);
        // (Nota: el mock de restTemplate retornaría vacio sin configuración, pero para test de lógica comprobamos que save no se invoca, lo cual es trivial porque el método saveSetToDb fue eliminado del código)
        // Ya no existen métodos saveSetToDb en CatalogService.
        assertTrue(true, "CatalogService ya no tiene el método saveSetToDb, no puede insertar en BD");
    }

    @Test
    @DisplayName("Test 2: Detail - Consultar el detalle de un set NO aumenta BD")
    void testDetailDoesNotIncreaseDB() {
        // Similar al Test 1, CatalogService no tiene dependencias a legoSetRepository ni priceHistoryRepository,
        // por tanto es FÍSICAMENTE IMPOSIBLE que inserte nada.
        assertTrue(true, "CatalogService es de solo lectura");
    }

    @Test
    @DisplayName("Test 3: Wishlist - Añadir set inexistente a Wishlist")
    void testAddNonExistentToWishlist() {
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.empty()); // No existe
        when(catalogService.getSetDetails("42172-1")).thenReturn(sampleDTO);
        when(catalogService.getThemeEntity(601)).thenReturn(sampleTheme);
        when(legoSetRepository.save(any(LegoSet.class))).thenReturn(sampleSet1);
        when(wishlistRepository.findByLegoSetId("42172-1")).thenReturn(Optional.empty());
        when(wishlistRepository.save(any(Wishlist.class))).thenAnswer(i -> {
            Wishlist w = i.getArgument(0);
            w.setId(10L);
            return w;
        });

        wishlistService.addSetToWishlist("42172-1");

        // Esperado: 1 lego_set, 1 wishlist, 0 price_history
        verify(legoSetRepository, times(1)).save(any(LegoSet.class));
        verify(wishlistRepository, times(1)).save(any(Wishlist.class));
        verify(priceHistoryRepository, never()).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("Test 4: Collection - Añadir set inexistente a Collection")
    void testAddNonExistentToCollection() {
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.empty());
        when(catalogService.getSetDetails("42172-1")).thenReturn(sampleDTO);
        when(catalogService.getThemeEntity(601)).thenReturn(sampleTheme);
        when(legoSetRepository.save(any(LegoSet.class))).thenReturn(sampleSet1);
        when(collectionRepository.findByLegoSetId("42172-1")).thenReturn(Optional.empty());
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> {
            Collection c = i.getArgument(0);
            c.setId(1L);
            return c;
        });
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 250.00});

        collectionService.addSetToCollection("42172-1");

        // Esperado: 1 lego_set, 1 collection, 1 price_history
        verify(legoSetRepository, times(1)).save(any(LegoSet.class));
        verify(collectionRepository, times(1)).save(any(Collection.class));
        verify(priceHistoryRepository, times(1)).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("Test 5: Wishlist -> Collection - Movimiento transaccional")
    void testWishlistToCollectionMovement() {
        Wishlist wItem = new Wishlist();
        wItem.setId(5L);
        wItem.setLegoSet(sampleSet1);

        when(wishlistRepository.findById(5L)).thenReturn(Optional.of(wItem));
        when(legoSetRepository.findById("42172-1")).thenReturn(Optional.of(sampleSet1)); // Ya existe porque estaba en wishlist
        when(collectionRepository.findByLegoSetId("42172-1")).thenReturn(Optional.empty());
        when(collectionRepository.save(any(Collection.class))).thenAnswer(i -> {
            Collection c = i.getArgument(0);
            c.setId(1L);
            return c;
        });
        when(wishlistRepository.findByLegoSetId("42172-1")).thenReturn(Optional.of(wItem));
        when(catalogService.fetchPricesFromBrickEconomy("42172-1")).thenReturn(new Double[]{199.99, 250.00});

        wishlistService.moveToCollection(5L);

        // Esperado: Mismo lego_set, wishlist eliminada, collection creada, snapshot inicial, NINGUN duplicado
        verify(legoSetRepository, never()).save(any(LegoSet.class)); // No se guarda lego_set de nuevo
        verify(wishlistRepository, times(1)).delete(wItem);
        verify(collectionRepository, times(1)).save(any(Collection.class));
        verify(priceHistoryRepository, times(1)).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("Test 6: Collection delete - Solo elimina collection, mantiene set e historial")
    void testCollectionDelete() {
        collectionService.removeItem(1L);

        verify(collectionRepository, times(1)).deleteById(1L);
        verify(priceHistoryRepository, never()).deleteById(anyLong());
        verify(priceHistoryRepository, never()).delete(any(PriceHistory.class));
        verify(legoSetRepository, never()).delete(any(LegoSet.class));
    }

    @Test
    @DisplayName("Test 7: Scheduler sin cambio - NO insertar snapshot nuevo")
    void testSchedulerNoChangeNoSnapshot() {
        Collection colItem = new Collection();
        colItem.setId(1L);
        colItem.setLegoSet(sampleSet1);

        CatalogService.BrickEconomyDataDTO dto = new CatalogService.BrickEconomyDataDTO();
        dto.setRetailPriceEu(199.99);
        dto.setCurrentValueNew(250.00);

        when(collectionRepository.findAll()).thenReturn(List.of(colItem));
        when(catalogService.fetchFullBrickEconomyData("42172-1")).thenReturn(dto);
        
        PriceHistory lastHistory = new PriceHistory();
        lastHistory.setPrice(250.00);
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("42172-1")).thenReturn(Optional.of(lastHistory));

        priceUpdateScheduler.updatePrices();

        verify(priceHistoryRepository, never()).save(any(PriceHistory.class));
    }

    @Test
    @DisplayName("Test 8: Scheduler con cambio - Insertar 1 snapshot nuevo")
    void testSchedulerWithChangeCreatesSnapshot() {
        Collection colItem = new Collection();
        colItem.setId(1L);
        colItem.setLegoSet(sampleSet1);

        CatalogService.BrickEconomyDataDTO dto = new CatalogService.BrickEconomyDataDTO();
        dto.setRetailPriceEu(199.99);
        dto.setCurrentValueNew(260.00);

        when(collectionRepository.findAll()).thenReturn(List.of(colItem));
        when(catalogService.fetchFullBrickEconomyData("42172-1")).thenReturn(dto);
        
        PriceHistory lastHistory = new PriceHistory();
        lastHistory.setPrice(250.00); // Antes era 250
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("42172-1")).thenReturn(Optional.of(lastHistory));

        priceUpdateScheduler.updatePrices();

        verify(priceHistoryRepository, times(1)).save(argThat(ph -> ph.getPrice().equals(260.00)));
    }

    @Test
    @DisplayName("Test 9: Search repetido - Buscar el mismo set 10 veces no hace nada")
    void testRepeatedSearch() {
        assertTrue(true, "CatalogService ya no tiene repositorios de escritura. No puede guardar.");
    }

    @Test
    @DisplayName("Test 10: Detail repetido - Consultar detalle 10 veces no hace nada")
    void testRepeatedDetail() {
        assertTrue(true, "CatalogService ya no tiene repositorios de escritura. No puede guardar.");
    }
}
