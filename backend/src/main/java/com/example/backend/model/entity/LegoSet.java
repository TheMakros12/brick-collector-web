package com.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lego_set", indexes = {
    @Index(name = "idx_ls_theme_id", columnList = "theme_id")
})
@Data
@NoArgsConstructor
public class LegoSet {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "theme_id")
    private Theme theme;

    private Integer pieces;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    private Boolean retired;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "retail_price")
    private Double retailPrice;

}
