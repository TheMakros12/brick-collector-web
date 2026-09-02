package com.example.backend.model.dto;

import lombok.Data;
import java.util.List;

@Data
public class CollectionHistoryDTO {
    private List<SnapshotDTO> snapshots;

    @Data
    public static class SnapshotDTO {
        private String date;           // "yyyy-MM-dd"
        private Double totalValue;
        private Double investedValue;
        private Double plusvalia;
    }
}
