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
    public LegoSet getOrCreateLegoSet(String finalSetId) {
        return legoSetRepository.findById(finalSetId).orElseGet(() -> {
            LegoSetDTO dto = catalogService.getSetDetails(finalSetId);
            if (dto == null) {
                throw new IllegalArgumentException("Set no encontrado en Rebrickable");
            }
            LegoSet newSet = new LegoSet();
            newSet.setId(dto.getSetId());
            newSet.setName(dto.getName());
            newSet.setPieces(dto.getNumParts());
            newSet.setImageUrl(dto.getSetImgUrl());
            if (dto.getYear() != null) {
                newSet.setReleaseDate(LocalDate.of(dto.getYear(), 1, 1));
            }
            newSet.setRetailPrice(dto.getRetailPrice());
            newSet.setRetired(false);

            if (dto.getThemeId() != null) {
                newSet.setTheme(catalogService.getThemeEntity(dto.getThemeId()));
            }

            return legoSetRepository.save(newSet);
        });
    }

    @Transactional
    public ListItemDTO addSetToCollection(String setId) {
        if (setId != null && !setId.contains("-")) {
            setId = setId + "-1";
        }
        String finalSetId = setId;

        LegoSet legoSet = getOrCreateLegoSet(finalSetId);

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
    public ListItemDTO updateSet(Long itemId, Double purchasePrice, String acquisitionDate, Integer purchaseYear, String acquisitionType) {
        Collection item = collectionRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Ítem no encontrado"));
        
        if (acquisitionType != null && !acquisitionType.isBlank()) {
            try {
                item.setAcquisitionType(Collection.AcquisitionType.valueOf(acquisitionType.trim().toUpperCase()));
            } catch (Exception e) {
                // Ignore invalid enum strings
            }
        }
        if (purchasePrice != null) {
            item.setPurchasePrice(purchasePrice);
        } else if (item.getAcquisitionType() == Collection.AcquisitionType.GIFT && purchasePrice == null) {
            // For gifts, default to 0.0 if not specified
            item.setPurchasePrice(0.0);
        }

        if (acquisitionDate != null && !acquisitionDate.isBlank()) {
            try {
                item.setAcquisitionDate(LocalDate.parse(acquisitionDate.trim()));
            } catch (Exception e) {
                if (purchaseYear != null) item.setAcquisitionDate(LocalDate.of(purchaseYear, 1, 1));
            }
        } else if (purchaseYear != null) {
            item.setAcquisitionDate(LocalDate.of(purchaseYear, 1, 1));
        }
        
        return mapToDTO(collectionRepository.save(item));
    }

    @Transactional
    public ListItemDTO updateSet(Long itemId, Double purchasePrice, Integer purchaseYear, String acquisitionType) {
        String acqDate = purchaseYear != null ? LocalDate.of(purchaseYear, 1, 1).toString() : null;
        return updateSet(itemId, purchasePrice, acqDate, purchaseYear, acquisitionType);
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
        if (item.getAcquisitionType() != null) {
            dto.setAcquisitionType(item.getAcquisitionType().name());
        }
        if (item.getAcquisitionDate() != null) {
            dto.setAcquisitionDate(item.getAcquisitionDate().toString());
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
