package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.HallOfHappinessSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HallOfHappinessSubmissionRepository extends JpaRepository<HallOfHappinessSubmission, Long> {
}
