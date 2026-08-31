package com.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "collection")
@Data
@NoArgsConstructor
public class Collection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "set_id", nullable = false, unique = true)
    private LegoSet legoSet;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquisition_type", nullable = false, length = 50)
    private AcquisitionType acquisitionType;

    @Column(name = "purchase_price", nullable = false)
    private Double purchasePrice;

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    public enum AcquisitionType {
        PURCHASED, PARTIAL, GIFT
    }
}
