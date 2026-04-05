package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {
    List<OrderStatusHistory> findAllByOrderIdInOrderByChangedAtDesc(List<Long> orderIds);
}

