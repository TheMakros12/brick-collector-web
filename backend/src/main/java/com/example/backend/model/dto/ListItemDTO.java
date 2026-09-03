package com.example.backend.model.dto;

import lombok.Data;

@Data
public class ListItemDTO {
    private Long id;
    private LegoSetDTO legoSet;
    private Double purchasePrice;
    private Integer purchaseYear;
    private String acquisitionDate;
    private String acquisitionType;
    private String purchaseLocation;
}
