package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.StallLease;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StallLeaseRepository extends JpaRepository<StallLease, UUID> {

    Optional<StallLease> findByIdAndFoodCourtId(UUID id, UUID foodCourtId);

    @Query("SELECT l FROM StallLease l WHERE l.foodCourtId = :foodCourtId ORDER BY l.startDate DESC")
    List<StallLease> findByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("SELECT l FROM StallLease l WHERE l.stallId = :stallId ORDER BY l.startDate DESC")
    List<StallLease> findByStall(@Param("stallId") UUID stallId);

    /**
     * Active leases on a stall whose date range overlaps [start, end] (end may be
     * null = open-ended). Used to reject double-booking a stall. An existing
     * lease overlaps when it starts on/before the new end and ends on/after the
     * new start, treating null end dates as +infinity.
     */
    @Query("""
            SELECT l FROM StallLease l
            WHERE l.stallId = :stallId
              AND l.status = com.broandbro.qrapp.foodcourt.enums.LeaseStatus.ACTIVE
              AND (:excludeId IS NULL OR l.id <> :excludeId)
              AND l.startDate <= COALESCE(:endDate, l.startDate)
              AND (l.endDate IS NULL OR l.endDate >= :startDate)
            """)
    List<StallLease> findOverlappingActiveLeases(@Param("stallId") UUID stallId,
                                                 @Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate,
                                                 @Param("excludeId") UUID excludeId);

    /** The currently active lease covering {@code onDate} for a stall, if any. */
    @Query("""
            SELECT l FROM StallLease l
            WHERE l.stallId = :stallId
              AND l.status = com.broandbro.qrapp.foodcourt.enums.LeaseStatus.ACTIVE
              AND l.startDate <= :onDate
              AND (l.endDate IS NULL OR l.endDate >= :onDate)
            ORDER BY l.startDate DESC
            """)
    List<StallLease> findActiveLeasesForStallOn(@Param("stallId") UUID stallId,
                                                @Param("onDate") LocalDate onDate);

    @Query("""
            SELECT l FROM StallLease l
            WHERE l.foodCourtId = :foodCourtId
              AND l.status = :status
            """)
    List<StallLease> findByFoodCourtAndStatus(@Param("foodCourtId") UUID foodCourtId,
                                              @Param("status") LeaseStatus status);

    @Query("SELECT l.stallId FROM StallLease l WHERE l.foodCourtId = :foodCourtId AND l.status = com.broandbro.qrapp.foodcourt.enums.LeaseStatus.ACTIVE")
    List<UUID> findOccupiedStallIds(@Param("foodCourtId") UUID foodCourtId);

    List<StallLease> findByIdInAndFoodCourtId(Collection<UUID> ids, UUID foodCourtId);
}
