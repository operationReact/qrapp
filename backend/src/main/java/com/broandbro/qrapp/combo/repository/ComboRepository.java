package com.broandbro.qrapp.combo.repository;

import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.enums.ComboStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComboRepository extends JpaRepository<Combo, Long>, JpaSpecificationExecutor<Combo> {

    /** Find active (non-deleted) combo by id. */
    @Query("SELECT c FROM Combo c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<Combo> findActiveById(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM Combo c JOIN c.items ci JOIN ci.menuItem mi " +
           "WHERE c.id = :id AND c.deletedAt IS NULL AND mi.location.id = :locationId " +
           "AND NOT EXISTS (SELECT ci2 FROM ComboItem ci2 JOIN ci2.menuItem mi2 " +
           "WHERE ci2.combo = c AND mi2.location.id <> :locationId)")
    Optional<Combo> findActiveByIdAndLocation(@Param("id") Long id,
                                               @Param("locationId") Long locationId);

    /** All non-deleted combos with pagination. */
    @Query("SELECT c FROM Combo c WHERE c.deletedAt IS NULL ORDER BY c.displayPriority DESC, c.id ASC")
    Page<Combo> findAllActive(Pageable pageable);

    /** Non-deleted, ACTIVE-status combos for public display, ordered by priority. */
    @Query("SELECT c FROM Combo c WHERE c.deletedAt IS NULL AND c.isActive = true AND c.status = com.broandbro.qrapp.enums.ComboStatus.ACTIVE ORDER BY c.displayPriority DESC, c.id ASC")
    List<Combo> findAllPublic();

    /** Count by status (non-deleted). */
    long countByStatusAndDeletedAtIsNull(ComboStatus status);

    long countByIsFeaturedTrueAndDeletedAtIsNull();
    long countByIsPreorderEligibleTrueAndDeletedAtIsNull();
    long countByIsSignatureComboTrueAndDeletedAtIsNull();
    long countByDeletedAtIsNull();

    /**
     * Location-scoped combo counts for the analytics summary.
     *
     * <p>A combo is attributed to a location through its menu items
     * ({@code combo_items -> menu_item.location_id}); by construction all of a
     * combo's items share one location. The shared
     * {@code (:allLocations = TRUE OR mi.location.id IN :locationIds)} guard keeps
     * the SUPER_ADMIN "All Locations" view intact while restricting ADMIN /
     * MANAGER to their assigned locations.</p>
     */
    @Query("""
           SELECT COUNT(DISTINCT c.id) AS totalCombos,
                  COUNT(DISTINCT CASE WHEN c.status = com.broandbro.qrapp.enums.ComboStatus.ACTIVE THEN c.id END) AS activeCombos,
                  COUNT(DISTINCT CASE WHEN c.isFeatured = true THEN c.id END) AS featuredCombos,
                  COUNT(DISTINCT CASE WHEN c.isPreorderEligible = true THEN c.id END) AS preorderCombos,
                  COUNT(DISTINCT CASE WHEN c.isSignatureCombo = true THEN c.id END) AS signatureCombos
           FROM Combo c JOIN c.items ci JOIN ci.menuItem mi
           WHERE c.deletedAt IS NULL
             AND (:allLocations = TRUE OR mi.location.id IN :locationIds)
           """)
    ComboCountProjection countMetricsInScope(@Param("allLocations") boolean allLocations,
                                             @Param("locationIds") List<Long> locationIds);

    interface ComboCountProjection {
        Long getTotalCombos();
        Long getActiveCombos();
        Long getFeaturedCombos();
        Long getPreorderCombos();
        Long getSignatureCombos();
    }
}
