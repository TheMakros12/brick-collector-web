package com.example.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class LegoSetDTO {
    @JsonProperty("set_num")
    private String setId;          // El ID original exacto, ej: "71049-1"
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("year")
    private Integer year;
    
    @JsonProperty("num_parts")
    private Integer numParts;
    
    @JsonProperty("set_img_url")
    private String setImgUrl;
    
    @JsonProperty("set_url")
    private String setUrl;
    
    @JsonProperty("retail_price")
    private Double retailPrice;

    @JsonProperty("market_value")
    private Double marketValue;

    @JsonProperty("theme_id")
    private Integer themeId;
}
