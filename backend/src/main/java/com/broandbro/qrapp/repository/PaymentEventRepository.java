package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
    List<PaymentEvent> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
