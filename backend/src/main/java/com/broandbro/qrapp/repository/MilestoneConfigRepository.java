package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.MilestoneConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface MilestoneConfigRepository extends JpaRepository<MilestoneConfig, Long> {

    List<MilestoneConfig> findAllByOrderByThresholdAmountAsc();

    List<MilestoneConfig> findAllByIsActiveTrueOrderByThresholdAmountAsc();

    Optional<MilestoneConfig> findByThresholdAmount(BigDecimal thresholdAmount);

    boolean existsByThresholdAmount(BigDecimal thresholdAmount);
}

