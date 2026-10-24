package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.OrderRefundRepository;
import com.broandbro.qrapp.service.RazorpayService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Cancellation refund routing and idempotency on real PostgreSQL row locks.
 * Skipped unless QRAPP_IT_PG_URL is set (same contract as WalletCheckoutSafetyPostgresIT).
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "QRAPP_IT_PG_URL", matches = ".+")
class OrderCancellationRefundPostgresIT extends OrderPaymentRaceTestBase {

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("QRAPP_IT_PG_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("QRAPP_IT_PG_USER", "postgres"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("QRAPP_IT_PG_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @MockitoSpyBean
    protected OrderRefundRepository orderRefundRepository;

    /** A PRE_ORDERED order paid from the wallet through the production payment service. */
    private Order preOrderPaidFromWallet(User owner, String total) {
        Order order = createOrder(owner, total, PaymentMethod.WALLET, "PENDING");
        order.setStatus(OrderStatus.PRE_ORDERED);
        orderRepository.save(order);
        walletOrderPaymentService.payOrderFromWallet(owner, order.getId(), new BigDecimal(total));
        return reload(order);
    }

    private String refundStatusOf(Order order) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM order_refunds WHERE order_id = ?", String.class, order.getId());
    }

    @MockitoSpyBean
    protected RazorpayService razorpayService;

    @Test
    void concurrentRefundAttemptsCallProviderExactlyOnce() throws Exception {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PAID");
        order.setRazorpayPaymentId("pay_" + UUID.randomUUID());
        orderRepository.save(order);
        cancel(order, owner);
        Long refundId = jdbcTemplate.queryForObject(
                "SELECT id FROM order_refunds WHERE order_id = ?", Long.class, order.getId());

        AtomicInteger providerCalls = new AtomicInteger();
        doCallRealMethod().when(refundService).processRefund(anyLong());
        doAnswer(inv -> {
            providerCalls.incrementAndGet();
            Thread.sleep(300);
            return "rfnd_" + UUID.randomUUID();
        }).when(razorpayService).refundPayment(any(), anyLong(), any());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    refundService.processRefund(refundId);
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(30, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(providerCalls.get()).as("only one claim may reach Razorpay").isEqualTo(1);
        assertThat(refundStatusOf(order)).isEqualTo("PROVIDER_ACCEPTED");
    }

    @Test
    void walletPaidPreOrderCancellationRefundsExactlyOnce() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = preOrderPaidFromWallet(owner, "120.00");
        assertThat(balanceOf(owner)).isEqualByComparingTo("380.00");

        cancel(order, owner);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).isEqualTo("REFUNDED");
        assertThat(after.getRefundStatus()).isEqualTo("REFUNDED");
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
        assertThat(successfulCredits(owner)).isEqualTo(1);
        assertThat(refundRecords(order)).isEqualTo(1);
        assertThat(refundStatusOf(order)).isEqualTo("SUCCEEDED");

        assertThatThrownBy(() -> cancel(order, owner)).isInstanceOf(IllegalArgumentException.class);
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
        assertThat(successfulCredits(owner)).isEqualTo(1);
        assertThat(refundRecords(order)).isEqualTo(1);
    }

    @Test
    void concurrentCancellationsCreditWalletOnce() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = preOrderPaidFromWallet(owner, "120.00");

        List<Throwable> outcomes = race(
                () -> cancel(order, owner),
                () -> cancel(order, owner));

        assertThat(failures(outcomes)).as("exactly one cancellation completes").isEqualTo(1);
        assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
        assertThat(successfulCredits(owner)).isEqualTo(1);
        assertThat(refundRecords(order)).isEqualTo(1);
    }

    @Test
    void razorpayPaidCancellationRequestsOneProviderRefundWithoutWalletCredit() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createRazorpayOrder(owner, "120.00", "PAID");
        order.setRazorpayPaymentId("pay_" + UUID.randomUUID());
        orderRepository.save(order);

        cancel(order, owner);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).as("provider refund not yet complete").isEqualTo("PAID");
        assertThat(after.getRefundStatus()).isEqualTo("PENDING");
        assertThat(refundStatusOf(order)).isEqualTo("PENDING");
        assertThat(refundRecords(order)).isEqualTo(1);
        assertThat(successfulCredits(owner)).isZero();
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
        verify(refundService, times(1)).processRefund(anyLong());

        assertThatThrownBy(() -> cancel(order, owner)).isInstanceOf(IllegalArgumentException.class);
        assertThat(refundRecords(order)).isEqualTo(1);
        verify(refundService, times(1)).processRefund(anyLong());
    }

    @Test
    void unpaidOrderCancellationCreatesNoRefund() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");

        cancel(order, owner);

        assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(reload(order).getRefundStatus()).isEqualTo("NOT_REQUIRED");
        assertThat(refundRecords(order)).isZero();
        verify(refundService, never()).processRefund(anyLong());
    }

    @Test
    void ineligibleOrderCannotBeCancelledOrRefunded() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createOrder(owner, "120.00", PaymentMethod.WALLET, "PAID");
        order.setStatus(OrderStatus.PREPARING);
        orderRepository.save(order);

        assertThatThrownBy(() -> cancel(order, owner)).isInstanceOf(IllegalArgumentException.class);

        assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(refundRecords(order)).isZero();
        assertThat(successfulCredits(owner)).isZero();
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
    }

    @Test
    void payAtStallCancellationIsRoutedToManualReviewWithoutWalletOrProviderCall() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createOrder(owner, "90.00", PaymentMethod.PAY_AT_STALL, "PAID");

        cancel(order, owner);

        assertThat(reload(order).getRefundStatus()).isEqualTo("MANUAL_REQUIRED");
        assertThat(refundStatusOf(order)).isEqualTo("MANUAL_REQUIRED");
        assertThat(successfulCredits(owner)).isZero();
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
        verify(refundService, never()).processRefund(anyLong());
    }

    @Test
    void walletRefundRollsBackWhenRefundRecordCannotBeWritten() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = preOrderPaidFromWallet(owner, "120.00");
        assertThat(balanceOf(owner)).isEqualByComparingTo("380.00");

        doThrow(new DataIntegrityViolationException("simulated refund insert failure"))
                .when(orderRefundRepository).save(any());

        assertThatThrownBy(() -> cancel(order, owner)).isInstanceOf(DataIntegrityViolationException.class);

        Order after = reload(order);
        assertThat(after.getStatus()).as("cancellation rolled back").isEqualTo(OrderStatus.PRE_ORDERED);
        assertThat(balanceOf(owner)).as("wallet credit rolled back").isEqualByComparingTo("380.00");
        assertThat(successfulCredits(owner)).isZero();
        assertThat(refundRecords(order)).isZero();
    }

    @Test
    void preOrderWalletPaymentWithInsufficientBalanceLeavesNoDebit() {
        User owner = createUser();
        setBalance(owner, "50.00");
        Order order = createOrder(owner, "120.00", PaymentMethod.WALLET, "PENDING");
        order.setStatus(OrderStatus.PRE_ORDERED);
        orderRepository.save(order);

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(
                owner, order.getId(), new BigDecimal("120.00")))
                .isInstanceOf(RuntimeException.class);

        Order after = reload(order);
        assertThat(after.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(after.getStatus()).isEqualTo(OrderStatus.PRE_ORDERED);
        assertThat(successfulDebits(owner)).isZero();
        assertThat(balanceOf(owner)).isEqualByComparingTo("50.00");
    }

    @Test
    void adminCancellationWithSameRequestPaymentCollectionCreatesRefundRecord() {
        User owner = createUser();
        Order order = createOrder(owner, "90.00", PaymentMethod.PAY_AT_STALL, "PENDING");

        AdminOrderUpdateRequest request = new AdminOrderUpdateRequest();
        request.setStatus("CANCELLED");
        request.setPaymentStatus("PAID");
        request.setReason("customer left before collection");
        orderService.updateAdminOrder(order.getId(), request, "admin", Optional.empty());

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).isEqualTo("PAID");
        assertThat(after.getRefundStatus()).isEqualTo("MANUAL_REQUIRED");
        assertThat(refundStatusOf(order)).isEqualTo("MANUAL_REQUIRED");
        assertThat(refundRecords(order)).isEqualTo(1);
        verify(refundService, never()).processRefund(anyLong());
    }

    @Test
    void adminCannotMarkAlreadyCancelledOrderPaidLate() {
        User owner = createUser();
        Order order = createOrder(owner, "90.00", PaymentMethod.PAY_AT_STALL, "PENDING");

        AdminOrderUpdateRequest cancel = new AdminOrderUpdateRequest();
        cancel.setStatus("CANCELLED");
        cancel.setReason("customer left");
        orderService.updateAdminOrder(order.getId(), cancel, "admin", Optional.empty());

        AdminOrderUpdateRequest lateCollection = new AdminOrderUpdateRequest();
        lateCollection.setPaymentStatus("PAID");
        assertThatThrownBy(() -> orderService.updateAdminOrder(order.getId(), lateCollection, "admin", Optional.empty()))
                .isInstanceOf(IllegalArgumentException.class);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(refundRecords(order)).isZero();
    }

    @Test
    void lateRazorpayCaptureOnCancelledOrderIsRecordedForReviewNotMarkedPaid() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        cancel(order, owner);

        capture(order, "evt_" + UUID.randomUUID(), "pay_" + UUID.randomUUID(), 12000L);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(reviewRecords(order)).isEqualTo(1);
        assertThat(refundRecords(order)).isZero();
    }
}
