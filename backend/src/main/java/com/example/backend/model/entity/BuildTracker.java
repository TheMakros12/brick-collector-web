package com.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad que hace seguimiento del progreso de construcción de un set específico en la colección.
 */
@Entity
@Table(name = "build_trackers")
@Data
@NoArgsConstructor
public class BuildTracker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Se asocia de manera estricta a un solo ítem de la colección
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_item_id", nullable = false, unique = true)
    private CollectionItem collectionItem;

    private Integer totalBags = 0;
    private Integer currentBag = 0;

    // Tal como pediste: Fecha y hora explícita del inicio
    private LocalDateTime startDate;
    
    // Tal como pediste: Fecha y hora explícita del fin
    private LocalDateTime endDate;

    // Siempre guardamos cuándo fue el último avance en la construcción (fecha y hora)
    @Column(nullable = false)
    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
