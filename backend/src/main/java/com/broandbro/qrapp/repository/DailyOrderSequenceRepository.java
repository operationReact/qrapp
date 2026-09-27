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
 * One sequence per location per day (location-aware).
 * Supports legacy sequences with location_code=NULL (BB-only behavior).
 *
 * Critical: Query methods use @Lock(LockModeType.PESSIMISTIC_WRITE) to ensure
 * thread-safe sequence generation even under high concurrent load.
 */
@Repository
public interface DailyOrderSequenceRepository extends JpaRepository<DailyOrderSequence, Long> {

    /**
     * Find the sequence for a given location and date (NEW: Location-aware).
     * Uses pessimistic write lock (SELECT FOR UPDATE) to ensure atomicity.
     *
     * This method MUST be called within a transactional context to properly
     * acquire and hold the lock until transaction completion.
     *
     * @param locationCode the location code (e.g., PRAGATI-TG-001)
     * @param dateKey date in YYYYMMDD format (e.g., "20260515")
     * @return Optional containing the sequence if found, empty otherwise
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dos FROM DailyOrderSequence dos WHERE dos.locationCode = :locationCode AND dos.dateKey = :dateKey")
    Optional<DailyOrderSequence> findByLocationCodeAndDateKeyWithLock(
            @Param("locationCode") String locationCode,
            @Param("dateKey") String dateKey);

    /**
     * Legacy query: Find the global sequence (location_code = NULL).
     * Kept for backward compatibility with existing order generation flow.
     * Uses pessimistic write lock (SELECT FOR UPDATE) to ensure atomicity.
     *
     * @param dateKey date in YYYYMMDD format (e.g., "20260515")
     * @return Optional containing the sequence if found, empty otherwise
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dos FROM DailyOrderSequence dos WHERE dos.locationCode IS NULL AND dos.dateKey = :dateKey")
    Optional<DailyOrderSequence> findByDateKeyWithLock(@Param("dateKey") String dateKey);
}
