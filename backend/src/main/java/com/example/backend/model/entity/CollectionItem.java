package com.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad que representa un Set guardado por el usuario, ya sea en su Colección o en su Wishlist.
 */
@Entity
@Table(name = "collection_items")
@Data
@NoArgsConstructor
public class CollectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación con el usuario (muchos sets pertenecen a un usuario)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // El ID real de Lego (ej: "42115") para luego consultar la info de la API
    @Column(nullable = false)
    private String setId;

    // Diferencia si lo tiene o si lo quiere
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListType listType;

    // Fecha y hora exacta en la que lo añadió a la lista
    @Column(nullable = false, updatable = false)
    private LocalDateTime addedAt;

    // Si está en la colección, puede tener un rastreador de construcción
    @OneToOne(mappedBy = "collectionItem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private BuildTracker buildTracker;

    public enum ListType {
        COLLECTION, WISHLIST
    }

    // Autogeneramos la fecha de inserción
    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }
}
