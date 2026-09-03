package com.example.backend.service;

import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.LegoSetRepository;
import com.example.backend.repository.PriceHistoryRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
public class PriceUpdateScheduler {

    private final CollectionRepository collectionRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final LegoSetRepository legoSetRepository;
    private final CatalogService catalogService;

    public PriceUpdateScheduler(CollectionRepository collectionRepository, 
                                PriceHistoryRepository priceHistoryRepository, 
                                LegoSetRepository legoSetRepository,
                                CatalogService catalogService) {
        this.collectionRepository = collectionRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.legoSetRepository = legoSetRepository;
        this.catalogService = catalogService;
    }

    @Scheduled(cron = "${price.update.cron:0 0 0 * * MON}")
    public Map<String, Object> updatePrices() {
        long startTime = System.currentTimeMillis();
        System.out.println("Iniciando actualización periódica de precios e importación de histórico real...");

        List<Collection> collectionItems = collectionRepository.findAll();
        Set<String> processedSetIds = new HashSet<>();
        int updatedCount = 0;
        int skippedCount = 0;
        int historicalImportedCount = 0;

        for (Collection item : collectionItems) {
            LegoSet set = item.getLegoSet();
            if (set == null || set.getId() == null || processedSetIds.contains(set.getId())) {
                continue;
            }

            processedSetIds.add(set.getId());

            try {
                CatalogService.BrickEconomyDataDTO dto = catalogService.fetchFullBrickEconomyData(set.getId());
                if (dto != null) {
                    boolean setUpdated = false;
                    if (dto.getRetired() != null && !Objects.equals(set.getRetired(), dto.getRetired())) {
                        set.setRetired(dto.getRetired());
                        setUpdated = true;
                    }
                    if (dto.getRetailPriceEu() != null && !Objects.equals(set.getRetailPrice(), dto.getRetailPriceEu())) {
                        set.setRetailPrice(dto.getRetailPriceEu());
                        setUpdated = true;
                    }
                    if (setUpdated) {
                        legoSetRepository.save(set);
                    }

                    // Populate historical price events array from BrickEconomy
                    if (dto.getPriceEventsNew() != null && !dto.getPriceEventsNew().isEmpty()) {
                        for (Map<String, Object> event : dto.getPriceEventsNew()) {
                            String dateStr = (String) event.get("date");
                            Number valNum = (Number) event.get("value");
                            if (dateStr != null && valNum != null) {
                                try {
                                    LocalDateTime eventDateTime = LocalDate.parse(dateStr).atStartOfDay();
                                    Double eventPrice = valNum.doubleValue();
                                    boolean exists = priceHistoryRepository.existsByLegoSetIdAndCheckedAt(set.getId(), eventDateTime);
                                    if (!exists) {
                                        PriceHistory ph = new PriceHistory();
                                        ph.setLegoSet(set);
                                        ph.setPrice(eventPrice);
                                        ph.setCheckedAt(eventDateTime);
                                        priceHistoryRepository.save(ph);
                                        historicalImportedCount++;
                                    }
                                } catch (Exception ex) {}
                            }
                        }
                    }

                    Double currentPrice = (dto.getCurrentValueNew() != null && dto.getCurrentValueNew() > 0)
                            ? dto.getCurrentValueNew()
                            : (set.getRetailPrice() != null ? set.getRetailPrice() : 0.0);

                    Optional<PriceHistory> lastHistory = priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc(set.getId());

                    if (lastHistory.isEmpty() || !lastHistory.get().getPrice().equals(currentPrice)) {
                        PriceHistory newHistory = new PriceHistory();
                        newHistory.setLegoSet(set);
                        newHistory.setPrice(currentPrice);
                        priceHistoryRepository.save(newHistory);
                        updatedCount++;
                        System.out.println("Precio actualizado para set " + set.getId() + ": " + currentPrice + "€");
                    } else {
                        skippedCount++;
                    }
                }

                Thread.sleep(200);
            } catch (Exception e) {
                System.err.println("Error actualizando precio para set " + set.getId() + ": " + e.getMessage());
            }
        }

        long duration = System.currentTimeMillis() - startTime;
        System.out.println("Actualización periódica finalizada en " + duration + " ms. Puntos históricos importados: " + historicalImportedCount);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "success");
        result.put("processedSets", processedSetIds.size());
        result.put("updatedPrices", updatedCount);
        result.put("historicalPointsImported", historicalImportedCount);
        result.put("skippedUnchanged", skippedCount);
        result.put("durationMs", duration);
        return result;
    }
}
