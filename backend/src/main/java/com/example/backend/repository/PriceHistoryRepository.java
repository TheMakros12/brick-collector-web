package com.example.backend.repository;

import com.example.backend.model.entity.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
    List<PriceHistory> findByLegoSetIdOrderByCheckedAtAsc(String setId);
    Optional<PriceHistory> findTopByLegoSetIdOrderByCheckedAtDesc(String setId);
}
