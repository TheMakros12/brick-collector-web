package com.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "themes")
@Data
@NoArgsConstructor
public class Theme {

    @Id
    private Integer id;

    @Column(nullable = false)
    private String name;
}
