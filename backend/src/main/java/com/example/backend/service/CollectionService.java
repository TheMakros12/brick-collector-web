package com.example.backend.service;

import com.example.backend.model.entity.CollectionItem;
import com.example.backend.model.entity.User;
import com.example.backend.repository.CollectionItemRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CollectionService {

    private final CollectionItemRepository collectionRepository;

    public CollectionService(CollectionItemRepository collectionRepository) {
        this.collectionRepository = collectionRepository;
    }

    public List<CollectionItem> getUserItems(User user, CollectionItem.ListType type) {
        if (type == null) {
            return collectionRepository.findByUser(user);
        }
        return collectionRepository.findByUserAndListType(user, type);
    }

    public CollectionItem addSet(User user, String setId, CollectionItem.ListType type) {
        // Verificar si ya lo tiene para no duplicar
        List<CollectionItem> existing = collectionRepository.findByUserAndListType(user, type);
        for (CollectionItem item : existing) {
            if (item.getSetId().equals(setId)) {
                throw new IllegalArgumentException("El set ya está en esta lista");
            }
        }

        CollectionItem newItem = new CollectionItem();
        newItem.setUser(user);
        newItem.setSetId(setId);
        newItem.setListType(type);
        
        return collectionRepository.save(newItem);
    }

    public void removeItem(Long itemId, User user) {
        CollectionItem item = collectionRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Ítem no encontrado"));
            
        // Seguridad: comprobar que el item pertenece a este usuario
        if (!item.getUser().getId().equals(user.getId())) {
            throw new SecurityException("No tienes permiso para borrar este ítem");
        }
        
        collectionRepository.delete(item);
    }
}
