package com.example.backend.repository;

import com.example.backend.model.entity.CollectionItem;
import com.example.backend.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Repositorio para buscar y guardar los Legos de un usuario (colección o wishlist).
 */
public interface CollectionItemRepository extends JpaRepository<CollectionItem, Long> {
    
    // Devuelve todos los sets asociados a un usuario en concreto
    List<CollectionItem> findByUser(User user);
    
    // Devuelve los sets filtrados por usuario y tipo (COLLECTION o WISHLIST)
    List<CollectionItem> findByUserAndListType(User user, CollectionItem.ListType listType);
}
