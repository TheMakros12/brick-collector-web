package com.example.backend.service;

import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.PriceHistoryRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class PriceUpdateScheduler {

    private final CollectionRepository collectionRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final CatalogService catalogService;

    public PriceUpdateScheduler(CollectionRepository collectionRepository, 
                                PriceHistoryRepository priceHistoryRepository, 
                                CatalogService catalogService) {
        this.collectionRepository = collectionRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.catalogService = catalogService;
    }

    @Scheduled(cron = "${price.update.cron:0 0 0 * * MON}")
    public Map<String, Object> updatePrices() {
        long startTime = System.currentTimeMillis();
        System.out.println("Iniciando actualización periódica de precios...");

        List<Collection> collectionItems = collectionRepository.findAll();
        Set<String> processedSetIds = new HashSet<>();
        int updatedCount = 0;
        int skippedCount = 0;

        for (Collection item : collectionItems) {
            LegoSet set = item.getLegoSet();
            if (set == null || set.getId() == null || processedSetIds.contains(set.getId())) {
                continue;
            }

            processedSetIds.add(set.getId());

            try {
                Double[] prices = catalogService.fetchPricesFromBrickEconomy(set.getId());
                Double currentPrice = (prices != null && prices.length > 1 && prices[1] != null && prices[1] > 0) 
                        ? prices[1] 
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
                    System.out.println("Precio sin cambios para set " + set.getId() + " (" + currentPrice + "€). Duplicado omitido.");
                }

                Thread.sleep(200);
            } catch (Exception e) {
                System.err.println("Error actualizando precio para set " + set.getId() + ": " + e.getMessage());
            }
        }

        long duration = System.currentTimeMillis() - startTime;
        System.out.println("Actualización periódica finalizada en " + duration + " ms.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "success");
        result.put("processedSets", processedSetIds.size());
        result.put("updatedPrices", updatedCount);
        result.put("skippedUnchanged", skippedCount);
        result.put("durationMs", duration);
        return result;
    }
}
