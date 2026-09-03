package com.example.backend.controller;

import com.example.backend.service.PriceUpdateScheduler;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final PriceUpdateScheduler priceUpdateScheduler;

    public TaskController(PriceUpdateScheduler priceUpdateScheduler) {
        this.priceUpdateScheduler = priceUpdateScheduler;
    }

    @PostMapping("/update-prices")
    public ResponseEntity<Map<String, Object>> triggerPriceUpdate() {
        Map<String, Object> result = priceUpdateScheduler.updatePrices();
        return ResponseEntity.ok(result);
    }
}
