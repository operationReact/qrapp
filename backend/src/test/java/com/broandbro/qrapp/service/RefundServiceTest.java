package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderRefund;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.ops.SchedulerJobControl;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.repository.OrderRefundRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.time.BusinessTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefundServiceTest {

    private static final String KEY = "order-10-cancel";

    private OrderRefundRepository refundRepo;
    private OrderRepository orderRepo;
    private RazorpayService razorpayService;
    private ApplicationEventPublisher eventPublisher;
    private RefundService service;
    private Order order;
    private OrderRefund refund;

    @BeforeEach
    void setUp() {
        refundRepo = mock(OrderRefundRepository.class);
        orderRepo = mock(OrderRepository.class);
        razorpayService = mock(RazorpayService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new RefundService(refundRepo, orderRepo, mock(UserRepository.class), razorpayService,
                mock(WalletService.class), eventPublisher, mock(PlatformTransactionManager.class),
                mock(SchedulerRunRecorder.class), mock(SchedulerJobControl.class));

        order = new Order();
        order.setId(10L);
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(PaymentMethod.RAZORPAY);
        order.setRazorpayPaymentId("pay_1");
        order.setGrandTotal(new BigDecimal("150.00"));
        order.setOrderNumber("ORD-10");
        order.setRefundStatus("PENDING");

        refund = new OrderRefund();
        refund.setId(5L);
        refund.setOrderId(10L);
        refund.setAmount(new BigDecimal("150.00"));
        refund.setMethod(OrderRefund.METHOD_RAZORPAY);
        refund.setStatus(OrderRefund.STATUS_PENDING);
        refund.setPaymentId("pay_1");
        refund.setIdempotencyKey(KEY);
        refund.setAttempts(1);
        refund.setNextAttemptAt(BusinessTime.now());

        when(refundRepo.claimForAttempt(eq(5L), any(), any(), eq(RefundService.MAX_ATTEMPTS))).thenReturn(1);
        when(refundRepo.findById(5L)).thenReturn(Optional.of(refund));
        when(orderRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(order));
    }

    @Test
    void definiteProviderRejectionMarksRefundFailedForRetry() {
        when(razorpayService.refundPayment(eq("pay_1"), eq(15000L), eq(KEY)))
                .thenThrow(new RazorpayService.RefundException("rejected", true, null));

        service.processRefund(5L);

        assertEquals(OrderRefund.STATUS_FAILED, refund.getStatus());
        assertNotNull(refund.getNextAttemptAt());
        assertTrue(refund.getNextAttemptAt().isAfter(BusinessTime.now().minusSeconds(5)));
        assertEquals("PENDING", order.getRefundStatus());
    }

    @Test
    void successfulProviderRefundWaitsForBankCreditWebhook() {
        when(razorpayService.refundPayment(eq("pay_1"), eq(15000L), eq(KEY))).thenReturn("rfnd_1");

        service.processRefund(5L);

        assertEquals(OrderRefund.STATUS_PROVIDER_ACCEPTED, refund.getStatus());
        assertEquals("rfnd_1", refund.getProviderRefundId());
        assertNull(refund.getCompletedAt());
        assertNull(refund.getNextAttemptAt());
        assertEquals("PENDING", order.getRefundStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertNull(order.getRefundReference());
    }

    @Test
    void acceptanceNeverDowngradesRefundAlreadySettledByWebhook() {
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        when(razorpayService.refundPayment(eq("pay_1"), eq(15000L), eq(KEY))).thenReturn("rfnd_1");

        service.processRefund(5L);

        assertEquals(OrderRefund.STATUS_SUCCEEDED, refund.getStatus());
    }

    @Test
    void failedWebhookAfterAcceptanceRequiresManualReviewInsteadOfResend() {
        refund.setStatus(OrderRefund.STATUS_PROVIDER_ACCEPTED);
        refund.setProviderRefundId("rfnd_1");
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.failed", "rfnd_1", KEY, "pay_1", 15000L));

        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
        assertNull(refund.getNextAttemptAt());
        assertEquals("MANUAL_REQUIRED", order.getRefundStatus());
    }

    @Test
    void processedWebhookAfterAcceptanceCompletesRefund() {
        refund.setStatus(OrderRefund.STATUS_PROVIDER_ACCEPTED);
        refund.setProviderRefundId("rfnd_7");
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_7", KEY, "pay_1", 15000L));

        assertEquals(OrderRefund.STATUS_PROCESSED_BY_GATEWAY, refund.getStatus());
        assertNotNull(refund.getCompletedAt());
        assertEquals("REFUNDED", order.getRefundStatus());
        assertEquals("rfnd_7", order.getRefundReference());
    }

    @Test
    void processedWebhookWithArnConfirmsBankCredit() {
        refund.setStatus(OrderRefund.STATUS_PROCESSING);
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(new RefundService.ProviderRefundUpdate(
                "refund.processed", "rfnd_7", KEY, "pay_1", 15000L, "normal", "normal", "ARN123"));

        assertEquals(OrderRefund.STATUS_SUCCEEDED, refund.getStatus());
        assertEquals("ARN123", refund.getAcquirerArn());
        assertEquals("normal", refund.getSpeedProcessed());
    }

    @Test
    void arnArrivingLaterPromotesProcessedByGatewayToSucceeded() {
        refund.setStatus(OrderRefund.STATUS_PROCESSED_BY_GATEWAY);
        refund.setProviderRefundId("rfnd_7");
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(new RefundService.ProviderRefundUpdate(
                "refund.speed_changed", "rfnd_7", KEY, "pay_1", 15000L, "normal", "normal", "ARN456"));

        assertEquals(OrderRefund.STATUS_SUCCEEDED, refund.getStatus());
        assertEquals("ARN456", refund.getAcquirerArn());
    }

    @Test
    void speedChangedWithoutArnKeepsStatus() {
        refund.setStatus(OrderRefund.STATUS_PROCESSING);
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(new RefundService.ProviderRefundUpdate(
                "refund.speed_changed", null, KEY, "pay_1", 15000L, "optimum", null, null));

        assertEquals(OrderRefund.STATUS_PROCESSING, refund.getStatus());
        assertEquals("optimum", refund.getSpeedRequested());
    }


    @Test
    void ambiguousProviderOutcomeLeavesRefundProcessingUnderLease() {
        when(razorpayService.refundPayment(eq("pay_1"), eq(15000L), eq(KEY)))
                .thenThrow(new RazorpayService.RefundException("timeout", false, null));

        service.processRefund(5L);

        assertEquals(OrderRefund.STATUS_PROCESSING, refund.getStatus());
        assertEquals("PENDING", order.getRefundStatus());
        assertEquals("PAID", order.getPaymentStatus());
    }

    @Test
    void reconcilesExistingProviderRefundInsteadOfRefundingAgain() {
        refund.setAttempts(2);
        when(razorpayService.findRefundIdByKey("pay_1", KEY)).thenReturn(Optional.of("rfnd_9"));

        service.processRefund(5L);

        verify(razorpayService, never()).refundPayment(any(), anyLong(), any());
        assertEquals(OrderRefund.STATUS_PROVIDER_ACCEPTED, refund.getStatus());
        assertEquals("rfnd_9", refund.getProviderRefundId());
    }

    @Test
    void lostClaimSendsNothingToProvider() {
        when(refundRepo.claimForAttempt(eq(5L), any(), any(), eq(RefundService.MAX_ATTEMPTS))).thenReturn(0);

        service.processRefund(5L);

        verify(razorpayService, never()).refundPayment(any(), anyLong(), any());
    }

    @Test
    void cancellationOfPaidRazorpayOrderRecordsPendingRefundAndPublishesEvent() {
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.empty());

        service.initiateCancellationRefund(order, LocalDateTime.of(2025, 1, 1, 12, 0));

        verify(refundRepo).save(any(OrderRefund.class));
        verify(eventPublisher).publishEvent(any(RefundRequestedEvent.class));
        assertEquals("PENDING", order.getRefundStatus());
        assertEquals(new BigDecimal("150.00"), order.getRefundAmount());
    }

    @Test
    void processedWebhookCompletesRefundFoundByKey() {
        refund.setStatus(OrderRefund.STATUS_PROCESSING);
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        boolean applied = service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_7", KEY, "pay_1", 15000L));

        assertTrue(applied);
        assertEquals(OrderRefund.STATUS_PROCESSED_BY_GATEWAY, refund.getStatus());
        assertNotNull(refund.getCompletedAt());
        assertEquals("rfnd_7", refund.getProviderRefundId());
        assertEquals("REFUNDED", order.getRefundStatus());
        assertEquals("REFUNDED", order.getPaymentStatus());
    }

    @Test
    void failedWebhookSchedulesRetryWithoutRecordingFailedRefundId() {
        refund.setStatus(OrderRefund.STATUS_PROCESSING);
        refund.setAttempts(1);
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.failed", "rfnd_bad", KEY, "pay_1", 15000L));

        assertEquals(OrderRefund.STATUS_FAILED, refund.getStatus());
        assertNotNull(refund.getNextAttemptAt());
        assertTrue(refund.getNextAttemptAt().isAfter(BusinessTime.now()));
        assertNull(refund.getProviderRefundId());
        assertEquals("PENDING", order.getRefundStatus());
    }

    @Test
    void failedWebhookDoesNotOverrideSucceededOrManualRefund() {
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        refund.setProviderRefundId("manual_ref");
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.failed", "rfnd_bad", KEY, "pay_1", 15000L));

        assertEquals(OrderRefund.STATUS_SUCCEEDED, refund.getStatus());
        assertEquals("manual_ref", refund.getProviderRefundId());
    }

    @Test
    void processedWebhookKeepsEarlierManualReference() {
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        refund.setProviderRefundId("manual_ref");
        when(refundRepo.findByIdempotencyKey(KEY)).thenReturn(Optional.of(refund));

        service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_7", KEY, "pay_1", 15000L));

        assertEquals("manual_ref", refund.getProviderRefundId());
    }

    @Test
    void webhookWithoutKeyMatchesOpenRefundByPaymentAndAmount() {
        refund.setStatus(OrderRefund.STATUS_PENDING);
        when(refundRepo.findByPaymentIdAndStatusIn(eq("pay_1"), any())).thenReturn(List.of(refund));

        assertTrue(service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_7", null, "pay_1", 15000L)));
        assertEquals(OrderRefund.STATUS_PROCESSED_BY_GATEWAY, refund.getStatus());
    }

    @Test
    void webhookForUnknownRefundIsIgnored() {
        when(refundRepo.findByIdempotencyKey("other-key")).thenReturn(Optional.empty());

        assertFalse(service.applyProviderRefundEvent(
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_x", "other-key", "pay_1", 100L)));
        verify(orderRepo, never()).findByIdForUpdate(any());
    }
}
