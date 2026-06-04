package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.UserMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface UserMilestoneRepository extends JpaRepository<UserMilestone, Long> {

    List<UserMilestone> findAllByUserIdOrderByMilestoneAmountAsc(Long userId);

    boolean existsByUserIdAndMilestoneAmount(Long userId, BigDecimal milestoneAmount);
}

