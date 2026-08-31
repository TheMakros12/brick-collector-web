package com.example.backend.service;

import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.Wishlist;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.WishlistRepository;
import com.example.backend.repository.LegoSetRepository;
import com.example.backend.repository.PriceHistoryRepository;
import com.example.backend.model.dto.ListItemDTO;
import com.example.backend.model.dto.LegoSetDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final WishlistRepository wishlistRepository;
    private final LegoSetRepository legoSetRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final CatalogService catalogService;

    public CollectionService(CollectionRepository collectionRepository, WishlistRepository wishlistRepository, 
                             LegoSetRepository legoSetRepository, PriceHistoryRepository priceHistoryRepository,
                             CatalogService catalogService) {
        this.collectionRepository = collectionRepository;
        this.wishlistRepository = wishlistRepository;
        this.legoSetRepository = legoSetRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.catalogService = catalogService;
    }

    public List<ListItemDTO> getCollection() {
        return collectionRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public ListItemDTO addSetToCollection(String setId) {
        if (setId != null && !setId.contains("-")) {
            setId = setId + "-1";
        }
        String finalSetId = setId;

        LegoSet legoSet = legoSetRepository.findById(finalSetId).orElseGet(() -> {
            catalogService.getSetDetails(finalSetId);
            return legoSetRepository.findById(finalSetId)
                .orElseThrow(() -> new IllegalArgumentException("Set no encontrado en Rebrickable"));
        });

        // Ensure uniqueness
        Optional<Collection> existing = collectionRepository.findByLegoSetId(finalSetId);
        if (existing.isPresent()) {
            return mapToDTO(existing.get());
        }

        Collection item = new Collection();
        item.setLegoSet(legoSet);
        item.setAcquisitionType(Collection.AcquisitionType.PURCHASED);
        item.setPurchasePrice(legoSet.getRetailPrice() != null ? legoSet.getRetailPrice() : 0.0);
        item.setAcquisitionDate(LocalDate.now());
        
        Collection saved = collectionRepository.save(item);

        // Remove from wishlist if exists
        wishlistRepository.findByLegoSetId(finalSetId).ifPresent(w -> wishlistRepository.delete(w));

        // Create initial price history
        createInitialPriceHistory(legoSet);

        return mapToDTO(saved);
    }

    @Transactional
    public void removeItem(Long itemId) {
        collectionRepository.deleteById(itemId);
    }
    
    @Transactional
    public ListItemDTO updateSet(Long itemId, Double purchasePrice, Integer purchaseYear) {
        Collection item = collectionRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Ítem no encontrado"));
        
        if (purchasePrice != null) item.setPurchasePrice(purchasePrice);
        if (purchaseYear != null) {
            item.setAcquisitionDate(LocalDate.of(purchaseYear, 1, 1));
        }
        
        return mapToDTO(collectionRepository.save(item));
    }
    
    private void createInitialPriceHistory(LegoSet set) {
        Double[] prices = catalogService.fetchPricesFromBrickEconomy(set.getId());
        PriceHistory history = new PriceHistory();
        history.setLegoSet(set);
        history.setPrice(prices[1] != null ? prices[1] : 0.0);
        priceHistoryRepository.save(history);
    }

    public ListItemDTO mapToDTO(Collection item) {
        ListItemDTO dto = new ListItemDTO();
        dto.setId(item.getId());
        dto.setPurchasePrice(item.getPurchasePrice());
        if (item.getAcquisitionDate() != null) {
            dto.setPurchaseYear(item.getAcquisitionDate().getYear());
        }
        dto.setLegoSet(mapSetToDTO(item.getLegoSet()));
        return dto;
    }

    public LegoSetDTO mapSetToDTO(LegoSet set) {
        LegoSetDTO dto = new LegoSetDTO();
        dto.setSetId(set.getId());
        dto.setName(set.getName());
        dto.setNumParts(set.getPieces());
        dto.setSetImgUrl(set.getImageUrl());
        if (set.getReleaseDate() != null) dto.setYear(set.getReleaseDate().getYear());
        dto.setRetailPrice(set.getRetailPrice());
        if (set.getTheme() != null) dto.setThemeId(set.getTheme().getId());
        
        // Fetch latest price from history
        Optional<PriceHistory> latestPrice = priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc(set.getId());
        if (latestPrice.isPresent()) {
            dto.setMarketValue(latestPrice.get().getPrice());
        } else {
            dto.setMarketValue(0.0);
        }
        
        return dto;
    }
}
