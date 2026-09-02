package com.example.backend.controller;

import com.example.backend.model.dto.CollectionHistoryDTO;
import com.example.backend.model.dto.SetHistoryDTO;
import com.example.backend.model.dto.StatisticsDTO;
import com.example.backend.service.StatisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/statistics")
@CrossOrigin(origins = "*")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("")
    public ResponseEntity<StatisticsDTO> getStatistics() {
        return ResponseEntity.ok(statisticsService.getStatistics());
    }

    @GetMapping("/history")
    public ResponseEntity<CollectionHistoryDTO> getCollectionHistory() {
        return ResponseEntity.ok(statisticsService.getCollectionHistory());
    }

    @GetMapping("/set/{setId}/history")
    public ResponseEntity<SetHistoryDTO> getSetHistory(@PathVariable String setId) {
        return ResponseEntity.ok(statisticsService.getSetHistory(setId));
    }
}
