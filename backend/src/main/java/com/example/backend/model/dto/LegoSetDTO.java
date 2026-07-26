package com.example.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * DTO que enviaremos al frontend. Es una mezcla limpia de los datos
 * de Rebrickable y el precio obtenido de Brickset.
 */
@Data
public class LegoSetDTO {
    @JsonProperty("set_num")
    private String setId;          // Ej: "42115" (Sin el -1)
    
    @JsonProperty("name")
    private String name;           // Nombre del set
    
    @JsonProperty("year")
    private Integer year;          // Año de salida
    
    @JsonProperty("num_parts")
    private Integer numParts;      // Número de piezas
    
    @JsonProperty("set_img_url")
    private String setImgUrl;      // Foto del Lego
    
    @JsonProperty("set_url")
    private String setUrl;         // Link a Rebrickable
    
    @JsonProperty("estimated_price")
    private Double estimatedPrice; // El precio real sacado de Brickset en Euros

    @JsonProperty("theme_id")
    private Integer themeId;       // El ID de categoría (necesario para el filtro)
}
