package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PartnerLocationRepository extends JpaRepository<PartnerLocation, Long> {
    @EntityGraph(attributePaths = {"partner", "location"})
    List<PartnerLocation> findByPartnerIdOrderByStatusDescEffectiveFromDesc(Long partnerId);
    @EntityGraph(attributePaths = {"partner", "location"})
    List<PartnerLocation> findByPartnerIdAndStatusOrderByStatusDescEffectiveFromDesc(Long partnerId,
                                                                                       PartnerRelationshipStatus status);

    @EntityGraph(attributePaths = {"partner", "location"})
    List<PartnerLocation> findByLocationIdOrderByStatusDescEffectiveFromDesc(Long locationId);

    Optional<PartnerLocation> findByPartnerIdAndLocationIdAndRelationshipTypeAndStatus(
            Long partnerId, Long locationId, PartnerRelationshipType type, PartnerRelationshipStatus status);

    boolean existsByPartnerIdAndLocationIdAndRelationshipTypeAndStatus(
            Long partnerId, Long locationId, PartnerRelationshipType type, PartnerRelationshipStatus status);

    boolean existsByPartnerIdAndLocationIdAndStatus(
            Long partnerId, Long locationId, PartnerRelationshipStatus status);

    Optional<PartnerLocation> findByIdAndPartnerId(Long id, Long partnerId);
    @EntityGraph(attributePaths = {"partner", "location"})
    Optional<PartnerLocation> findByPartnerIdAndLocationIdAndStatus(Long partnerId, Long locationId,
                                                                      PartnerRelationshipStatus status);

    @Query("select count(pl) from PartnerLocation pl where pl.partner.id = :partnerId and pl.status = :status")
    long countByPartnerIdAndStatus(@Param("partnerId") Long partnerId,
                                   @Param("status") PartnerRelationshipStatus status);

    long countByLocationIdAndStatusAndRelationshipType(Long locationId, PartnerRelationshipStatus status,
                                                        PartnerRelationshipType type);
    long countByPartnerIdAndStatusAndRelationshipType(Long partnerId, PartnerRelationshipStatus status,
                                                       PartnerRelationshipType type);

    @Query("select pl from PartnerLocation pl join fetch pl.partner where pl.location.id = :locationId and pl.status = :status and pl.relationshipType = :type")
    Optional<PartnerLocation> findActivePrimaryByLocation(@Param("locationId") Long locationId,
                                                           @Param("status") PartnerRelationshipStatus status,
                                                           @Param("type") PartnerRelationshipType type);
}
