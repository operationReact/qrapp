package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.OrderSupportRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderSupportRequestRepository extends JpaRepository<OrderSupportRequest, Long> {
    boolean existsByOrderIdAndStatus(Long orderId, String status);

    List<OrderSupportRequest> findAllByOrderIdOrderByCreatedAtDesc(Long orderId);
}
