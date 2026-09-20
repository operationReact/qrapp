package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.DailyOrderSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for managing daily order sequences with pessimistic locking.
 *
 * Single sequence per day (BB location only).
 *
 * Critical: Query method uses @Lock(LockModeType.PESSIMISTIC_WRITE) to ensure
 * thread-safe sequence generation even under high concurrent load.
 */
@Repository
public interface DailyOrderSequenceRepository extends JpaRepository<DailyOrderSequence, Long> {

    /**
     * Find the sequence for a given date.
     * Uses pessimistic write lock (SELECT FOR UPDATE) to ensure atomicity.
     *
     * This method MUST be called within a transactional context to properly
     * acquire and hold the lock until transaction completion.
     *
     * @param dateKey date in YYYYMMDD format (e.g., "20260515")
     * @return Optional containing the sequence if found, empty otherwise
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dos FROM DailyOrderSequence dos WHERE dos.dateKey = :dateKey")
    Optional<DailyOrderSequence> findByDateKeyWithLock(@Param("dateKey") String dateKey);
}
