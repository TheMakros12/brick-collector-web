package com.example.backend.service;

import com.example.backend.model.dto.StatisticsDTO;
import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.PriceHistoryRepository;
import com.example.backend.repository.WishlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StatisticsServiceTest {

    @Mock
    private CollectionRepository collectionRepository;

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private PriceHistoryRepository priceHistoryRepository;

    @Mock
    private CatalogService catalogService;

    @InjectMocks
    private StatisticsService statisticsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetStatistics_CalculationsAndGuards() {
        // Set 1: Purchased set
        LegoSet set1 = new LegoSet();
        set1.setId("10330-1");
        set1.setName("McLaren MP4/4");
        set1.setRetailPrice(100.0);
        set1.setPieces(693);

        Collection item1 = new Collection();
        item1.setId(1L);
        item1.setLegoSet(set1);
        item1.setPurchasePrice(80.0);
        item1.setAcquisitionType(Collection.AcquisitionType.PURCHASED);

        PriceHistory ph1 = new PriceHistory();
        ph1.setLegoSet(set1);
        ph1.setPrice(120.0);
        ph1.setCheckedAt(LocalDateTime.of(2024, 1, 1, 12, 0));

        // Set 2: Gift (purchasePrice = 0.0)
        LegoSet set2 = new LegoSet();
        set2.setId("75301-1");
        set2.setName("X-Wing");
        set2.setRetailPrice(50.0);
        set2.setPieces(474);

        Collection item2 = new Collection();
        item2.setId(2L);
        item2.setLegoSet(set2);
        item2.setPurchasePrice(0.0); // Gift
        item2.setAcquisitionType(Collection.AcquisitionType.GIFT);

        PriceHistory ph2 = new PriceHistory();
        ph2.setLegoSet(set2);
        ph2.setPrice(60.0);
        ph2.setCheckedAt(LocalDateTime.of(2024, 3, 1, 12, 0));

        when(collectionRepository.findAll()).thenReturn(Arrays.asList(item1, item2));
        when(wishlistRepository.findAll()).thenReturn(Collections.emptyList());
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("10330-1")).thenReturn(Optional.of(ph1));
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("75301-1")).thenReturn(Optional.of(ph2));

        StatisticsDTO stats = statisticsService.getStatistics();

        assertNotNull(stats);
        assertEquals(2, stats.getSetsCount());
        assertEquals(1167, stats.getTotalPieces());
        assertEquals(180.0, stats.getCurrentValueTotal(), 0.001); // 120 + 60
        assertEquals(80.0, stats.getInvestedTotal(), 0.001);      // 80 + 0
        assertEquals(150.0, stats.getRetailPriceTotal(), 0.001);   // 100 + 50
        assertEquals(100.0, stats.getPlusvaliaTotal(), 0.001);     // 180 - 80 (Ganancia económica real)
        assertEquals(70.0, stats.getSavingsTotal(), 0.001);        // 150 - 80 (Ahorro en ofertas/regalos)
        assertEquals(125.0, stats.getRoiPercent(), 0.001);         // ((180 - 80) / 80) * 100
        assertEquals(20.0, stats.getRevaluationPvpPercent(), 0.001);// ((180 - 150) / 150) * 100
        assertEquals(2.25, stats.getValuePerEuroInvested(), 0.001);// 180 / 80

        // Gift ROI check (Set 2 has null ROI because purchasePrice == 0)
        Optional<StatisticsDTO.LegoSetStatDTO> set2Stat = stats.getRankings().getTop5Profit().stream()
                .filter(s -> s.getSetId().equals("75301-1")).findFirst();
        assertTrue(set2Stat.isPresent());
        assertNull(set2Stat.get().getRoiPercent());

        // Highest ROI ranking should exclude gifts with purchasePrice == 0
        assertEquals("10330-1", stats.getRankings().getHighestRoi().getSetId());
    }

    @Test
    void testSetWithoutHistory_StrictReadOnly() {
        LegoSet set = new LegoSet();
        set.setId("99999-1");
        set.setName("Unknown Set");
        set.setRetailPrice(200.0);

        Collection item = new Collection();
        item.setLegoSet(set);
        item.setPurchasePrice(150.0);

        when(collectionRepository.findAll()).thenReturn(Collections.singletonList(item));
        when(wishlistRepository.findAll()).thenReturn(Collections.emptyList());
        when(priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc("99999-1")).thenReturn(Optional.empty());

        StatisticsDTO stats = statisticsService.getStatistics();

        // Strict read-only: Unknown price history falls back to retail price (200.0), no DB saves!
        assertEquals(200.0, stats.getCurrentValueTotal(), 0.001);
        assertEquals(150.0, stats.getInvestedTotal(), 0.001);
        assertEquals(200.0, stats.getRetailPriceTotal(), 0.001);
        verify(priceHistoryRepository, never()).save(any());
    }

    @Test
    void testGetCollectionHistory_ForwardFillAlgorithm() {
        LegoSet setA = new LegoSet();
        setA.setId("SET-A");
        Collection itemA = new Collection();
        itemA.setLegoSet(setA);

        PriceHistory phA1 = new PriceHistory();
        phA1.setLegoSet(setA);
        phA1.setPrice(100.0);
        phA1.setCheckedAt(LocalDateTime.of(2024, 1, 1, 12, 0));

        PriceHistory phA2 = new PriceHistory();
        phA2.setLegoSet(setA);
        phA2.setPrice(110.0);
        phA2.setCheckedAt(LocalDateTime.of(2024, 3, 1, 12, 0));

        LegoSet setB = new LegoSet();
        setB.setId("SET-B");
        Collection itemB = new Collection();
        itemB.setLegoSet(setB);

        PriceHistory phB1 = new PriceHistory();
        phB1.setLegoSet(setB);
        phB1.setPrice(50.0);
        phB1.setCheckedAt(LocalDateTime.of(2024, 2, 1, 12, 0));

        PriceHistory phB2 = new PriceHistory();
        phB2.setLegoSet(setB);
        phB2.setPrice(55.0);
        phB2.setCheckedAt(LocalDateTime.of(2024, 3, 1, 12, 0));

        when(collectionRepository.findAll()).thenReturn(Arrays.asList(itemA, itemB));
        when(priceHistoryRepository.findByLegoSetIdOrderByCheckedAtAsc("SET-A")).thenReturn(Arrays.asList(phA1, phA2));
        when(priceHistoryRepository.findByLegoSetIdOrderByCheckedAtAsc("SET-B")).thenReturn(Arrays.asList(phB1, phB2));

        var colHist = statisticsService.getCollectionHistory();
        var snaps = colHist.getSnapshots();

        assertNotNull(snaps);
        assertEquals(3, snaps.size());

        // 2024-01-01: Set A (100) -> Total 100
        assertEquals("2024-01-01", snaps.get(0).getDate());
        assertEquals(100.0, snaps.get(0).getTotalValue(), 0.001);

        // 2024-02-01: Set A (carried 100) + Set B (50) -> Total 150 (NOT 50!)
        assertEquals("2024-02-01", snaps.get(1).getDate());
        assertEquals(150.0, snaps.get(1).getTotalValue(), 0.001);

        // 2024-03-01: Set A (110) + Set B (55) -> Total 165
        assertEquals("2024-03-01", snaps.get(2).getDate());
        assertEquals(165.0, snaps.get(2).getTotalValue(), 0.001);
    }
}
