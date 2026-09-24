package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;

@Repository
public interface HallOfHappinessPhotoRepository extends JpaRepository<HallOfHappinessPhoto, Long> {

    @Query("""
            SELECT photo FROM HallOfHappinessPhoto photo
            JOIN FETCH photo.partyOrder order
            WHERE photo.status = :status
              AND photo.consentStatus = :consent
              AND order.status = com.broandbro.qrapp.enums.PartyOrderStatus.COMPLETED
            ORDER BY photo.displayOrder ASC, photo.publishedAt DESC, photo.id DESC
            """)
    Page<HallOfHappinessPhoto> findPublished(
            @Param("status") HallOfHappinessPhotoStatus status,
            @Param("consent") HallOfHappinessConsentStatus consent,
            Pageable pageable);

    @Query("""
            SELECT photo FROM HallOfHappinessPhoto photo
            JOIN FETCH photo.partyOrder order
            WHERE photo.status = :status
              AND photo.consentStatus = :consent
              AND order.status = com.broandbro.qrapp.enums.PartyOrderStatus.COMPLETED
              AND order.location.id = :locationId
            ORDER BY photo.displayOrder ASC, photo.publishedAt DESC, photo.id DESC
            """)
    Page<HallOfHappinessPhoto> findPublishedForLocation(
            @Param("status") HallOfHappinessPhotoStatus status,
            @Param("consent") HallOfHappinessConsentStatus consent,
            @Param("locationId") Long locationId,
            Pageable pageable);

    @Query("""
            SELECT photo FROM HallOfHappinessPhoto photo
            JOIN FETCH photo.partyOrder order
            WHERE photo.customerId = :customerId
              AND photo.status <> com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus.REMOVED
              AND order.status = com.broandbro.qrapp.enums.PartyOrderStatus.COMPLETED
            ORDER BY photo.createdAt DESC
            """)
    Page<HallOfHappinessPhoto> findForCustomer(@Param("customerId") Long customerId, Pageable pageable);

    @Query("""
            SELECT photo FROM HallOfHappinessPhoto photo
            JOIN FETCH photo.partyOrder order
            WHERE (:status IS NULL OR photo.status = :status)
              AND (:consent IS NULL OR photo.consentStatus = :consent)
              AND (:orderId IS NULL OR order.id = :orderId)
              AND (:customerId IS NULL OR photo.customerId = :customerId)
              AND (:fromDate IS NULL OR order.eventDateTime >= :fromDate)
              AND (:toDate IS NULL OR order.eventDateTime < :toDate)
              AND (:allLocations = TRUE OR order.location.id IN :locationIds)
              AND (:search IS NULL OR
                   LOWER(COALESCE(photo.caption, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(order.eventType, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(order.userName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(order.userPhone, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY photo.createdAt DESC
            """)
    Page<HallOfHappinessPhoto> search(
            @Param("status") HallOfHappinessPhotoStatus status,
            @Param("consent") HallOfHappinessConsentStatus consent,
            @Param("orderId") Long orderId,
            @Param("customerId") Long customerId,
            @Param("fromDate") java.time.LocalDateTime fromDate,
            @Param("toDate") java.time.LocalDateTime toDate,
            @Param("search") String search,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") Collection<Long> locationIds,
            Pageable pageable);

    Optional<HallOfHappinessPhoto> findByIdAndCustomerId(Long id, Long customerId);

    long countByPartyOrderIdAndCustomerId(Long partyOrderId, Long customerId);

    @Query("""
            SELECT photo FROM HallOfHappinessPhoto photo
            JOIN FETCH photo.partyOrder order
            WHERE photo.partyOrder.id = :orderId
              AND photo.customerId = :customerId
            ORDER BY photo.createdAt DESC
            """)
    java.util.List<HallOfHappinessPhoto> findForCustomerOrder(
            @Param("orderId") Long orderId,
            @Param("customerId") Long customerId);
}
