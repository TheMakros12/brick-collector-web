package com.example.backend.controller;

import com.example.backend.model.dto.ListItemDTO;
import com.example.backend.service.CollectionService;
import com.example.backend.service.WishlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collection")
@CrossOrigin(origins = "*")
public class CollectionController {

    private final CollectionService collectionService;
    private final WishlistService wishlistService;

    public CollectionController(CollectionService collectionService, WishlistService wishlistService) {
        this.collectionService = collectionService;
        this.wishlistService = wishlistService;
    }

    @GetMapping("/")
    public ResponseEntity<List<ListItemDTO>> getItems(
            @RequestParam(required = false) String type) {
        
        if ("WISHLIST".equalsIgnoreCase(type)) {
            return ResponseEntity.ok(wishlistService.getWishlist());
        }
        return ResponseEntity.ok(collectionService.getCollection());
    }

    @PostMapping("/add")
    public ResponseEntity<?> addSet(@RequestBody Map<String, String> payload) {
        try {
            String setId = payload.get("setId");
            String type = payload.get("type");
            
            ListItemDTO saved;
            if ("WISHLIST".equalsIgnoreCase(type)) {
                saved = wishlistService.addSetToWishlist(setId);
            } else {
                saved = collectionService.addSetToCollection(setId);
            }
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/remove/{itemId}")
    public ResponseEntity<?> removeSet(@PathVariable Long itemId, @RequestParam(required = false) String type) {
        try {
            if ("WISHLIST".equalsIgnoreCase(type)) {
                wishlistService.removeItem(itemId);
            } else if ("COLLECTION".equalsIgnoreCase(type)) {
                collectionService.removeItem(itemId);
            } else {
                try { collectionService.removeItem(itemId); } catch(Exception e) {}
                try { wishlistService.removeItem(itemId); } catch(Exception e) {}
            }
            return ResponseEntity.ok(Map.of("message", "Eliminado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PutMapping("/update/{itemId}")
    public ResponseEntity<?> updateSet(@PathVariable Long itemId, @RequestBody Map<String, Object> payload) {
        try {
            Double purchasePrice = payload.get("purchasePrice") != null ? Double.valueOf(payload.get("purchasePrice").toString()) : null;
            String acquisitionDate = payload.get("acquisitionDate") != null ? payload.get("acquisitionDate").toString() : null;
            Integer purchaseYear = payload.get("purchaseYear") != null ? Integer.valueOf(payload.get("purchaseYear").toString()) : null;
            String acquisitionType = payload.get("acquisitionType") != null ? payload.get("acquisitionType").toString() : null;
            String purchaseLocation = payload.get("purchaseLocation") != null ? payload.get("purchaseLocation").toString() : null;
            ListItemDTO updated = collectionService.updateSet(itemId, purchasePrice, acquisitionDate, purchaseYear, acquisitionType, purchaseLocation);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PutMapping("/move/{itemId}")
    public ResponseEntity<?> moveSet(@PathVariable Long itemId, @RequestBody Map<String, String> payload) {
        try {
            String newType = payload.get("type");
            if ("COLLECTION".equalsIgnoreCase(newType)) {
                ListItemDTO moved = wishlistService.moveToCollection(itemId);
                return ResponseEntity.ok(moved);
            }
            return ResponseEntity.badRequest().body(Map.of("error", "Operación no soportada"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
