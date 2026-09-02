package com.example.backend.model.dto;

import lombok.Data;
import java.util.List;

@Data
public class SetHistoryDTO {
    private String setId;
    private String name;
    private String setImgUrl;
    private Double retailPrice;
    private Double purchasePrice;
    private Double currentValue;
    private Boolean hasPriceHistory;
    private Double allTimeHigh;
    private String allTimeHighDate;
    private Double allTimeLow;
    private String allTimeLowDate;
    private Double growthPct;
    private Double growthAmount;
    private List<PricePointDTO> history;

    @Data
    public static class PricePointDTO {
        private String checkedAt;
        private Double price;
    }
}
