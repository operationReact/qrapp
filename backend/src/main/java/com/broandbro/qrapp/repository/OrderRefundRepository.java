package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.OrderRefund;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRefundRepository extends JpaRepository<OrderRefund, Long> {

    Optional<OrderRefund> findByIdempotencyKey(String idempotencyKey);

    Optional<OrderRefund> findFirstByOrderIdAndStatusOrderByIdDesc(Long orderId, String status);

    Optional<OrderRefund> findFirstByProviderRefundId(String providerRefundId);

    /** Ids only: a webhook resolves the row here, then locks it, so no unlocked entity is loaded before the lock. */
    @Query("SELECT r.id FROM OrderRefund r WHERE r.idempotencyKey = :key")
    List<Long> findIdsByIdempotencyKey(@Param("key") String key);

    @Query("SELECT r.id FROM OrderRefund r WHERE r.providerRefundId = :providerRefundId ORDER BY r.id")
    List<Long> findIdsByProviderRefundId(@Param("providerRefundId") String providerRefundId);

    List<OrderRefund> findAllByOrderIdInOrderByIdDesc(Collection<Long> orderIds);

    List<OrderRefund> findTop50ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            Collection<String> statuses, LocalDateTime now);

    /** Locks the refund row so the status read before a claim is the status the claim replaces. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM OrderRefund r WHERE r.id = :id")
    Optional<OrderRefund> findByIdForUpdate(@Param("id") Long id);

    /**
     * Atomically moves a due refund to PROCESSING and takes a lease (stored in nextAttemptAt).
     * Only one caller can win the claim, so the same refund is never sent to the provider twice concurrently.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE OrderRefund r SET r.status = 'PROCESSING', r.attempts = r.attempts + 1, "
            + "r.nextAttemptAt = :leaseUntil, r.updatedAt = :now "
            + "WHERE r.id = :id AND r.status IN ('PENDING', 'FAILED', 'PROCESSING') "
            + "AND r.nextAttemptAt <= :now AND r.attempts < :maxAttempts")
    int claimForAttempt(@Param("id") Long id,
                        @Param("now") LocalDateTime now,
                        @Param("leaseUntil") LocalDateTime leaseUntil,
                        @Param("maxAttempts") int maxAttempts);

    /** Moves a due refund whose automatic attempts are used up to MANUAL_REQUIRED. */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE OrderRefund r SET r.status = 'MANUAL_REQUIRED', r.nextAttemptAt = NULL, r.updatedAt = :now, "
            + "r.failureReason = 'Automatic retries exhausted; verify the refund on the Razorpay dashboard' "
            + "WHERE r.id = :id AND r.status IN ('PENDING', 'FAILED', 'PROCESSING') "
            + "AND r.nextAttemptAt <= :now AND r.attempts >= :maxAttempts")
    int escalateIfExhausted(@Param("id") Long id,
                            @Param("now") LocalDateTime now,
                            @Param("maxAttempts") int maxAttempts);
}
