package com.broandbro.qrapp.partnernotification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PartnerNotificationRepository extends JpaRepository<PartnerNotification, Long> {
    boolean existsByPartnerIdAndPartnerUserIdAndEventKey(Long partnerId, Long partnerUserId, String eventKey);

    Optional<PartnerNotification> findByIdAndPartnerIdAndPartnerUserId(Long id, Long partnerId, Long partnerUserId);

    Page<PartnerNotification> findByPartnerIdAndPartnerUserIdOrderByCreatedAtDescIdDesc(
            Long partnerId, Long partnerUserId, Pageable pageable);

    Page<PartnerNotification> findByPartnerIdAndPartnerUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(
            Long partnerId, Long partnerUserId, Pageable pageable);

    long countByPartnerIdAndPartnerUserIdAndReadAtIsNull(Long partnerId, Long partnerUserId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PartnerNotification n SET n.readAt = :readAt "
            + "WHERE n.partnerId = :partnerId AND n.partnerUserId = :partnerUserId AND n.readAt IS NULL")
    int markAllRead(@Param("partnerId") Long partnerId, @Param("partnerUserId") Long partnerUserId,
                    @Param("readAt") Instant readAt);
}
