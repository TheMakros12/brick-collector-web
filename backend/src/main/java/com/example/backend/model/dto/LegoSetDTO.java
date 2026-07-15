package com.example.backend.model.dto;

import lombok.Data;

/**
 * DTO que enviaremos al frontend. Es una mezcla limpia de los datos
 * de Rebrickable y el precio obtenido de Brickset.
 */
@Data
public class LegoSetDTO {
    private String setId;          // Ej: "42115" (Sin el -1)
    private String name;           // Nombre del set
    private Integer year;          // Año de salida
    private Integer numParts;      // Número de piezas
    private String setImgUrl;      // Foto del Lego
    private Double estimatedPrice; // El precio real sacado de Brickset en Euros
}
