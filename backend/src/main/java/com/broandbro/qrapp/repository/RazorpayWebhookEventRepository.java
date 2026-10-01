package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.RazorpayWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RazorpayWebhookEventRepository extends JpaRepository<RazorpayWebhookEvent, Long> {
    @Modifying
    @Query(value = """
            INSERT INTO razorpay_webhook_events
                (event_id, event_type, razorpay_order_id, razorpay_payment_id, received_at)
            VALUES (:eventId, :eventType, :orderId, :paymentId, CURRENT_TIMESTAMP)
            ON CONFLICT (event_id) DO NOTHING
            """, nativeQuery = true)
    int claimEvent(@Param("eventId") String eventId,
                   @Param("eventType") String eventType,
                   @Param("orderId") String orderId,
                   @Param("paymentId") String paymentId);
}
