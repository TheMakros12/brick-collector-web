package com.example.backend.service;

import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.PriceHistoryRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.Optional;

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

    // Se ejecuta 1 vez por semana, por ejemplo los domingos a las 00:00
    @Scheduled(cron = "${price.update.cron:0 0 0 * * SUN}")
    public void updatePrices() {
        System.out.println("Iniciando actualización periódica de precios desde BrickEconomy...");
        
        for (Collection item : collectionRepository.findAll()) {
            LegoSet set = item.getLegoSet();
            Double[] prices = catalogService.fetchPricesFromBrickEconomy(set.getId());
            Double currentPrice = prices[1] != null ? prices[1] : 0.0;

            Optional<PriceHistory> lastHistory = priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc(set.getId());
            
            if (lastHistory.isEmpty() || !lastHistory.get().getPrice().equals(currentPrice)) {
                PriceHistory newHistory = new PriceHistory();
                newHistory.setLegoSet(set);
                newHistory.setPrice(currentPrice);
                priceHistoryRepository.save(newHistory);
                System.out.println("Precio actualizado para set " + set.getId() + ": " + currentPrice + "€");
            } else {
                System.out.println("Precio sin cambios para set " + set.getId() + " (" + currentPrice + "€). No se genera registro duplicado.");
            }
        }
        System.out.println("Actualización periódica de precios finalizada.");
    }
}
