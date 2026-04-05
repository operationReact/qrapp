package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);
    Page<Order> findAllByStatus(OrderStatus status, Pageable pageable);
    List<Order> findAllByUserIdOrderByCreatedAtDescIdDesc(Long userId);
    List<Order> findAllByPhoneOrderByCreatedAtDescIdDesc(String phone);
    List<Order> findAllByStatusInOrderByCreatedAtAscIdAsc(Collection<OrderStatus> statuses, Pageable pageable);
}
