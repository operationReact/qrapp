package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);
    Page<Order> findAllByStatus(OrderStatus status, Pageable pageable);
    List<Order> findAllByUserIdOrderByCreatedAtDescIdDesc(Long userId);
    List<Order> findAllByPhoneOrderByCreatedAtDescIdDesc(String phone);
    List<Order> findAllByStatusInOrderByCreatedAtAscIdAsc(Collection<OrderStatus> statuses, Pageable pageable);

    /** Same as above but strictly excludes pre-orders (for kitchen queue). */
    List<Order> findAllByStatusInAndPreOrderFalseOrderByCreatedAtAscIdAsc(Collection<OrderStatus> statuses, Pageable pageable);

    /** Location-scoped live queue (kitchen). location.id must be in the supplied set. */
    List<Order> findAllByStatusInAndPreOrderFalseAndLocationIdInOrderByCreatedAtAscIdAsc(
            Collection<OrderStatus> statuses, Collection<Long> locationIds, Pageable pageable);

    long countByPreOrderFalse();
    long countByStatusAndPreOrderFalse(OrderStatus status);
    long countByStatusInAndPreOrderFalse(Collection<OrderStatus> statuses);
    long countByPaymentStatusIgnoreCaseAndPreOrderFalse(String paymentStatus);
    long countByCompletedAtGreaterThanEqualAndCompletedAtLessThanAndPreOrderFalse(
            LocalDateTime from,
            LocalDateTime to);

    // ── Location-scoped dashboard counters ────────────────────────────────────
    long countByPreOrderFalseAndLocationIdIn(Collection<Long> locationIds);
    long countByStatusAndPreOrderFalseAndLocationIdIn(OrderStatus status, Collection<Long> locationIds);
    long countByStatusInAndPreOrderFalseAndLocationIdIn(Collection<OrderStatus> statuses, Collection<Long> locationIds);
    long countByPaymentStatusIgnoreCaseAndPreOrderFalseAndLocationIdIn(String paymentStatus, Collection<Long> locationIds);
    long countByCompletedAtGreaterThanEqualAndCompletedAtLessThanAndPreOrderFalseAndLocationIdIn(
            LocalDateTime from,
            LocalDateTime to,
            Collection<Long> locationIds);

    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0)
            FROM orders
            WHERE pre_order = FALSE
              AND created_at IS NOT NULL
              AND completed_at IS NOT NULL
              AND completed_at >= :from
              AND completed_at < :to
            """, nativeQuery = true)
    Double averageFulfillmentMinutes(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0)
            FROM orders
            WHERE pre_order = FALSE
              AND created_at IS NOT NULL
              AND completed_at IS NOT NULL
              AND completed_at >= :from
              AND completed_at < :to
              AND location_id IN (:locationIds)
            """, nativeQuery = true)
    Double averageFulfillmentMinutesForLocations(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
            SELECT COUNT(*)
            FROM orders
            WHERE pre_order = FALSE
              AND (
                    (status = 'ORDER_PLACED'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                 OR (status = 'PREPARING'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '15 minutes')
                 OR (status = 'READY'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '10 minutes')
              )
            """, nativeQuery = true)
    long countDelayedLiveOrders();

    @Query(value = """
            SELECT COUNT(*)
            FROM orders
            WHERE pre_order = FALSE
              AND location_id IN (:locationIds)
              AND (
                    (status = 'ORDER_PLACED'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                 OR (status = 'PREPARING'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '15 minutes')
                 OR (status = 'READY'
                     AND COALESCE(last_status_changed_at, created_at)
                         <= CURRENT_TIMESTAMP - INTERVAL '10 minutes')
              )
            """, nativeQuery = true)
    long countDelayedLiveOrdersForLocations(@Param("locationIds") Collection<Long> locationIds);

    long countByUserId(Long userId);

    @Query("SELECT MAX(o.createdAt) FROM Order o WHERE o.userId = :userId")
    Optional<LocalDateTime> findLastOrderAtByUserId(@Param("userId") Long userId);

    /** Sum of grandTotal for all COMPLETED orders for a given user */
    @Query("SELECT COALESCE(SUM(o.grandTotal), 0) FROM Order o WHERE o.userId = :userId AND o.status = 'COMPLETED'")
    BigDecimal sumLifetimeSpendByUserId(@Param("userId") Long userId);

    /** All pre-orders scheduled within a time range, sorted by scheduled time */
    @Query("SELECT o FROM Order o WHERE o.preOrder = true AND o.scheduledAt BETWEEN :from AND :to ORDER BY o.scheduledAt ASC")
    List<Order> findPreOrdersScheduledBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Count pre-orders by status */
    long countByPreOrderTrueAndStatus(com.broandbro.qrapp.enums.OrderStatus status);

    /** Clear location for orders when location is deleted. */
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Order o SET o.location = null WHERE o.location.id = :locationId")
    void clearLocationForOrders(@Param("locationId") Long locationId);
}
