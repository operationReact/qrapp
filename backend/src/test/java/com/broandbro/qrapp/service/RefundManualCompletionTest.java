package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderRefund;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.ops.SchedulerJobControl;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.repository.OrderRefundRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefundManualCompletionTest {

    private static final String KEY = "order-10-cancel";
    private static final String RFND = "rfnd_1";

    private OrderRefundRepository refundRepo;
    private OrderRepository orderRepo;
    private RazorpayService razorpayService;
    private RefundService service;
    private Order order;
    private OrderRefund refund;

    @BeforeEach
    void setUp() {
        refundRepo = mock(OrderRefundRepository.class);
        orderRepo = mock(OrderRepository.class);
        razorpayService = mock(RazorpayService.class);
        service = new RefundService(refundRepo, orderRepo, mock(UserRepository.class), razorpayService,
                mock(WalletService.class), mock(ApplicationEventPublisher.class), mock(PlatformTransactionManager.class),
                mock(SchedulerRunRecorder.class), mock(SchedulerJobControl.class));

        order = new Order();
        order.setId(10L);
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(PaymentMethod.RAZORPAY);
        order.setRazorpayPaymentId("pay_1");
        order.setGrandTotal(new BigDecimal("150.00"));
        order.setRefundStatus("PENDING");

        refund = new OrderRefund();
        refund.setId(5L);
        refund.setOrderId(10L);
        refund.setAmount(new BigDecimal("150.00"));
        refund.setMethod(OrderRefund.METHOD_RAZORPAY);
        refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
        refund.setPaymentId("pay_1");
        refund.setIdempotencyKey(KEY);
        refund.setAttempts(RefundService.MAX_ATTEMPTS);

        when(refundRepo.findFirstByOrderIdAndStatusOrderByIdDesc(10L, OrderRefund.STATUS_MANUAL_REQUIRED))
                .thenReturn(Optional.of(refund));
        when(refundRepo.findByIdForUpdate(5L)).thenReturn(Optional.of(refund));
        when(orderRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(order));
    }

    @Test
    void verifiedProcessedRefundCompletesWithProviderIdAndActor() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", KEY));

        OrderRefund completed = service.completeManualRefund(10L, " " + RFND + " ", "admin@example.com");

        assertEquals(OrderRefund.STATUS_SUCCEEDED, completed.getStatus());
        assertEquals(RFND, completed.getProviderRefundId());
        assertEquals("admin@example.com", completed.getResolvedBy());
        assertEquals("REFUNDED", order.getPaymentStatus());
    }

    @Test
    void refundStillPendingAtProviderCannotBeCompleted() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "pending", KEY));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void failedProviderRefundCannotBeCompleted() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "failed", KEY));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void providerFetchFailureRollsBackAndLeavesRowForRetry() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenThrow(new RazorpayService.RefundException("timeout", false, null));

        assertThrows(IllegalStateException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
        assertEquals(null, refund.getProviderRefundId());
    }

    @Test
    void refundWithDifferentKeyIsRejected() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", "order-99-cancel"));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void refundWithDifferentAmountOrPaymentIsRejected() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 12000L, "processed", KEY));
        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));

        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_2", 15000L, "processed", KEY));
        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void nonRefundIdReferenceIsRejectedWithoutProviderCall() {
        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, "bank-transfer-123", "admin"));
        verify(razorpayService, never()).fetchRefund(anyString(), anyString());
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void referenceAlreadyRecordedOnAnotherRefundIsRejected() {
        OrderRefund other = new OrderRefund();
        other.setId(6L);
        when(refundRepo.findFirstByProviderRefundId(RFND)).thenReturn(Optional.of(other));
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", KEY));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void recordedProviderIdMustMatchVerificationReference() {
        refund.setProviderRefundId("rfnd_recorded");

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin"));
        verify(razorpayService, never()).fetchRefund(eq("pay_1"), eq(RFND));
    }

    @Test
    void dashboardRefundWithoutAcknowledgementIsRejected() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin", false));
        verify(razorpayService, never()).findRefundByKey(anyString(), anyString());
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void acknowledgedDashboardRefundCompletesWhenNoLiveRefundUnderOurKey() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));
        when(razorpayService.findRefundByKey("pay_1", KEY)).thenReturn(Optional.empty());

        OrderRefund completed = service.completeManualRefund(10L, RFND, "admin", true);

        assertEquals(OrderRefund.STATUS_SUCCEEDED, completed.getStatus());
        assertEquals(RFND, completed.getProviderRefundId());
        assertEquals("REFUNDED", order.getPaymentStatus());
    }

    @Test
    void acknowledgedDashboardRefundCompletesWhenOurOwnAttemptFailed() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));
        when(razorpayService.findRefundByKey("pay_1", KEY))
                .thenReturn(Optional.of(new RazorpayService.ProviderRefund("rfnd_ours", "failed")));

        assertEquals(OrderRefund.STATUS_SUCCEEDED,
                service.completeManualRefund(10L, RFND, "admin", true).getStatus());
    }

    @Test
    void acknowledgedDashboardRefundIsBlockedByLiveRefundUnderOurKey() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));
        when(razorpayService.findRefundByKey("pay_1", KEY))
                .thenReturn(Optional.of(new RazorpayService.ProviderRefund("rfnd_ours", "processed")));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin", true));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
        assertEquals(null, refund.getProviderRefundId());
    }

    @Test
    void dashboardRefundLookupFailureRollsBack() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));
        when(razorpayService.findRefundByKey("pay_1", KEY)).thenThrow(new IllegalStateException("provider down"));

        assertThrows(IllegalStateException.class,
                () -> service.completeManualRefund(10L, RFND, "admin", true));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
        assertEquals(null, refund.getProviderRefundId());
    }

    @Test
    void dashboardRefundWithMismatchedPaymentIsRejectedEvenWhenAcknowledged() {
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_2", 15000L, "processed", null));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin", true));
        verify(razorpayService, never()).findRefundByKey(anyString(), anyString());
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }

    @Test
    void dashboardRefundReferenceAlreadyLinkedElsewhereIsRejected() {
        OrderRefund other = new OrderRefund();
        other.setId(6L);
        when(refundRepo.findFirstByProviderRefundId(RFND)).thenReturn(Optional.of(other));
        when(razorpayService.fetchRefund("pay_1", RFND))
                .thenReturn(new RazorpayService.RefundDetail(RFND, "pay_1", 15000L, "processed", null));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeManualRefund(10L, RFND, "admin", true));
        assertEquals(OrderRefund.STATUS_MANUAL_REQUIRED, refund.getStatus());
    }
}
