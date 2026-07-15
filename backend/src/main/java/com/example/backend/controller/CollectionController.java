package com.example.backend.controller;

import com.example.backend.model.entity.CollectionItem;
import com.example.backend.model.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.CollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collection")
@CrossOrigin(origins = "*")
public class CollectionController {

    private final CollectionService collectionService;
    private final UserRepository userRepository; // Solo para resolver el usuario temporalmente

    public CollectionController(CollectionService collectionService, UserRepository userRepository) {
        this.collectionService = collectionService;
        this.userRepository = userRepository;
    }

    // Nota: Recibimos el userId temporalmente hasta que se implemente JWT en el filtro de seguridad
    @GetMapping("/{userId}")
    public ResponseEntity<List<CollectionItem>> getItems(
            @PathVariable Long userId,
            @RequestParam(required = false) CollectionItem.ListType type) {
        
        User user = userRepository.findById(userId).orElseThrow();
        return ResponseEntity.ok(collectionService.getUserItems(user, type));
    }

    @PostMapping("/{userId}/add")
    public ResponseEntity<?> addSet(
            @PathVariable Long userId,
            @RequestBody Map<String, String> payload) {
        try {
            User user = userRepository.findById(userId).orElseThrow();
            String setId = payload.get("setId");
            CollectionItem.ListType type = CollectionItem.ListType.valueOf(payload.get("type").toUpperCase());
            
            CollectionItem saved = collectionService.addSet(user, setId, type);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{userId}/remove/{itemId}")
    public ResponseEntity<?> removeSet(
            @PathVariable Long userId,
            @PathVariable Long itemId) {
        try {
            User user = userRepository.findById(userId).orElseThrow();
            collectionService.removeItem(itemId, user);
            return ResponseEntity.ok("Eliminado correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
