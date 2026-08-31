package com.example.backend.repository;

import com.example.backend.model.entity.LegoSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LegoSetRepository extends JpaRepository<LegoSet, String> {
}
