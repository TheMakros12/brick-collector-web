package com.example.backend.service;

import com.example.backend.model.entity.Wishlist;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.repository.WishlistRepository;
import com.example.backend.repository.LegoSetRepository;
import com.example.backend.model.dto.ListItemDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final LegoSetRepository legoSetRepository;
    private final CatalogService catalogService;
    private final CollectionService collectionService; // Para reusar el mapeo

    public WishlistService(WishlistRepository wishlistRepository, LegoSetRepository legoSetRepository, 
                           CatalogService catalogService, CollectionService collectionService) {
        this.wishlistRepository = wishlistRepository;
        this.legoSetRepository = legoSetRepository;
        this.catalogService = catalogService;
        this.collectionService = collectionService;
    }

    public List<ListItemDTO> getWishlist() {
        return wishlistRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public ListItemDTO addSetToWishlist(String setId) {
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
        Optional<Wishlist> existing = wishlistRepository.findByLegoSetId(finalSetId);
        if (existing.isPresent()) {
            return mapToDTO(existing.get());
        }

        Wishlist item = new Wishlist();
        item.setLegoSet(legoSet);
        Wishlist saved = wishlistRepository.save(item);

        return mapToDTO(saved);
    }

    @Transactional
    public void removeItem(Long itemId) {
        wishlistRepository.deleteById(itemId);
    }
    
    @Transactional
    public ListItemDTO moveToCollection(Long itemId) {
        Wishlist item = wishlistRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Ítem no encontrado"));
        
        String setId = item.getLegoSet().getId();
        ListItemDTO collectionDto = collectionService.addSetToCollection(setId); // Este método ya borra de Wishlist
        return collectionDto;
    }

    private ListItemDTO mapToDTO(Wishlist item) {
        ListItemDTO dto = new ListItemDTO();
        dto.setId(item.getId());
        dto.setLegoSet(collectionService.mapSetToDTO(item.getLegoSet()));
        return dto;
    }
}
