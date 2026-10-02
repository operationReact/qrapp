package com.broandbro.qrapp.campaign.repository;

import com.broandbro.qrapp.campaign.entity.HomeCampaign;
import com.broandbro.qrapp.enums.HomeCampaignType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface HomeCampaignRepository extends JpaRepository<HomeCampaign, Long> {

    @Query("SELECT c FROM HomeCampaign c WHERE c.deletedAt IS NULL AND c.id = :id")
    Optional<HomeCampaign> findActiveById(@Param("id") Long id);

    /** Location-scoped lookup: non-deleted AND (global OR owned by one of the given locations). */
    @Query("""
            SELECT c FROM HomeCampaign c
            WHERE c.deletedAt IS NULL AND c.id = :id
              AND (c.location IS NULL OR c.location.id IN :locationIds)
            """)
    Optional<HomeCampaign> findActiveByIdAndLocationIdIn(@Param("id") Long id,
                                                          @Param("locationIds") Collection<Long> locationIds);

    @Query("SELECT c FROM HomeCampaign c WHERE c.deletedAt IS NULL ORDER BY c.type ASC, c.displayOrder ASC, c.id ASC")
    List<HomeCampaign> findAllNonDeleted();

    @Query("""
            SELECT c FROM HomeCampaign c
            WHERE c.deletedAt IS NULL AND (c.location IS NULL OR c.location.id IN :locationIds)
            ORDER BY c.type ASC, c.displayOrder ASC, c.id ASC
            """)
    List<HomeCampaign> findAllNonDeletedInScope(@Param("locationIds") Collection<Long> locationIds);

    /**
     * Customer-facing feed: non-deleted, active, within its scheduled window,
     * and either GLOBAL or owned by the customer's active location. Never
     * leaks another location's campaigns.
     */
    @Query("""
            SELECT c FROM HomeCampaign c
            WHERE c.deletedAt IS NULL
              AND c.isActive = true
              AND c.type = :type
              AND (c.location IS NULL OR c.location.id = :locationId)
              AND (c.startsAt IS NULL OR c.startsAt <= :now)
              AND (c.endsAt   IS NULL OR c.endsAt   >= :now)
            ORDER BY c.displayOrder ASC, c.id ASC
            """)
    List<HomeCampaign> findPublicActive(@Param("type") HomeCampaignType type,
                                        @Param("locationId") Long locationId,
                                        @Param("now") Instant now);

    /** Same as {@link #findPublicActive} but for customers with no resolved location (global-only). */
    @Query("""
            SELECT c FROM HomeCampaign c
            WHERE c.deletedAt IS NULL
              AND c.isActive = true
              AND c.type = :type
              AND c.location IS NULL
              AND (c.startsAt IS NULL OR c.startsAt <= :now)
              AND (c.endsAt   IS NULL OR c.endsAt   >= :now)
            ORDER BY c.displayOrder ASC, c.id ASC
            """)
    List<HomeCampaign> findPublicActiveGlobalOnly(@Param("type") HomeCampaignType type,
                                                  @Param("now") Instant now);
}
