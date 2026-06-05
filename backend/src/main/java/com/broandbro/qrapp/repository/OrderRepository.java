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
}

