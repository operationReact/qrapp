package com.broandbro.qrapp.combo.repository;

import com.broandbro.qrapp.combo.entity.ComboCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComboCampaignRepository extends JpaRepository<ComboCampaign, Long> {

    @Query("SELECT c FROM ComboCampaign c WHERE c.deletedAt IS NULL AND c.id = :id")
    Optional<ComboCampaign> findActiveById(Long id);

    /**
     * Returns all non-deleted, active campaigns whose date window is current
     * (or has no date restrictions).
     */
    @Query("""
            SELECT c FROM ComboCampaign c
            WHERE c.deletedAt IS NULL
              AND c.isActive = true
              AND c.status = com.broandbro.qrapp.enums.ComboStatus.ACTIVE
              AND (c.startsAt IS NULL OR c.startsAt <= :now)
              AND (c.endsAt   IS NULL OR c.endsAt   >= :now)
            ORDER BY c.displayPriority DESC, c.id ASC
            """)
    List<ComboCampaign> findAllCurrentlyActive(Instant now);

    @Query("SELECT c FROM ComboCampaign c WHERE c.deletedAt IS NULL ORDER BY c.displayPriority DESC, c.id ASC")
    List<ComboCampaign> findAllNonDeleted();
}

