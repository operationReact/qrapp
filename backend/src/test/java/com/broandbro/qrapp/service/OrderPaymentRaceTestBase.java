package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.VerifyPaymentRequest;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.entity.WalletTransaction;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.service.RazorpayWebhookService.ProcessingResult;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

/**
 * Order-versus-provider-webhook and cancellation races, plus signature-verification persistence.
 * Runs on the same committed-data basis as {@link WalletCheckoutSafetyTestBase}.
 * Provider refunds are stubbed: the AFTER_COMMIT listener would otherwise call Razorpay.
 */
abstract class OrderPaymentRaceTestBase extends WalletCheckoutSafetyTestBase {

    @Autowired protected RazorpayWebhookService webhookService;

    @Value("${razorpay.secret}")
    private String razorpaySecret;

    @MockitoSpyBean
    protected RefundService refundService;

    @BeforeEach
    void stubProviderRefundCall() {
        doNothing().when(refundService).processRefund(anyLong());
    }

    // ---- helpers ----

    protected Order createRazorpayOrder(User owner, String total, String paymentStatus) {
        Order order = createOrder(owner, total, PaymentMethod.RAZORPAY, paymentStatus);
        order.setRazorpayOrderId("order_rzp_" + UUID.randomUUID());
        return orderRepository.save(order);
    }

    protected ProcessingResult capture(Order order, String eventId, String paymentId, long amountPaise) {
        return webhookService.process(eventId, "payment.captured", paymentId, order.getRazorpayOrderId(), amountPaise);
    }

    protected void cancel(Order order, User owner) {
        orderService.cancelOrderByCustomer(order.getId(), owner);
    }

    protected Order reload(Order order) {
        return orderRepository.findById(order.getId()).orElseThrow();
    }

    protected long reviewRecords(Order order) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payment_events WHERE order_id = ? AND new_status = ?",
                Long.class, order.getId(), OrderService.PAYMENT_REVIEW_REQUIRED);
    }

    protected long refundRecords(Order order) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM order_refunds WHERE order_id = ?", Long.class, order.getId());
    }

    protected long webhookRecords(Order order) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM razorpay_webhook_events WHERE razorpay_order_id = ?",
                Long.class, order.getRazorpayOrderId());
    }

    private static String newId(String prefix) {
        return prefix + "_" + UUID.randomUUID();
    }

    // ---- Scenario A: cancellation racing a captured-payment webhook ----

    protected void scenarioCancellationRacingCapturedWebhook() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        AtomicReference<ProcessingResult> webhook = new AtomicReference<>();

        List<Throwable> outcomes = race(
                () -> cancel(order, owner),
                () -> webhook.set(capture(order, newId("evt"), newId("pay"), 12000)));

        assertThat(failures(outcomes)).as("cancel and webhook must both complete").isZero();
        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(webhookRecords(order)).isEqualTo(1);
        if ("PAID".equals(after.getPaymentStatus())) {
            assertThat(webhook.get()).isEqualTo(ProcessingResult.PAID);
            assertThat(refundRecords(order)).as("webhook-first: cancellation must create a refund").isEqualTo(1);
            assertThat(reviewRecords(order)).isZero();
        } else {
            assertThat(after.getPaymentStatus()).isEqualTo("PENDING");
            assertThat(webhook.get()).isEqualTo(ProcessingResult.IGNORED);
            assertThat(refundRecords(order)).as("cancel-first: nothing was paid, so no refund").isZero();
            assertThat(reviewRecords(order)).as("cancel-first: capture recorded for review").isEqualTo(1);
        }
    }

    // ---- Scenario B: webhook racing another webhook for the same order ----

    protected void scenarioWebhookRacingWebhookPaysOnce() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        String paymentId = newId("pay");
        AtomicReference<ProcessingResult> first = new AtomicReference<>();
        AtomicReference<ProcessingResult> second = new AtomicReference<>();

        List<Throwable> outcomes = race(
                () -> first.set(capture(order, newId("evt"), paymentId, 12000)),
                () -> second.set(capture(order, newId("evt"), paymentId, 12000)));

        assertThat(failures(outcomes)).isZero();
        assertThat(List.of(first.get(), second.get()))
                .containsExactlyInAnyOrder(ProcessingResult.PAID, ProcessingResult.IGNORED);
        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
        assertThat(reload(order).getStatus()).isNotEqualTo(OrderStatus.CANCELLED);
        assertThat(reviewRecords(order)).isZero();
        assertThat(refundRecords(order)).isZero();
        assertThat(webhookRecords(order)).isEqualTo(2);
    }

    // ---- Scenario C: wallet payment racing a Razorpay webhook ----

    /** WALLET order carrying a provider order id (not produced by the app; defensive). Only the wallet may pay it. */
    protected void scenarioWalletPaymentRacingWebhookOnWalletOrder() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createOrder(owner, "120.00", PaymentMethod.WALLET, "PENDING");
        order.setRazorpayOrderId(newId("order_rzp"));
        orderRepository.save(order);
        AtomicReference<ProcessingResult> webhook = new AtomicReference<>();

        List<Throwable> outcomes = race(
                () -> walletOrderPaymentService.payOrderFromWallet(owner, order.getId(), new BigDecimal("120.00")),
                () -> webhook.set(capture(order, newId("evt"), newId("pay"), 12000)));

        assertThat(failures(outcomes)).isZero();
        assertThat(webhook.get()).as("the webhook never marks a WALLET order PAID").isEqualTo(ProcessingResult.IGNORED);
        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
        assertThat(successfulDebits(owner)).isEqualTo(1);
        assertThat(balanceOf(owner)).isEqualByComparingTo("380.00");
        assertThat(reviewRecords(order)).isZero();
    }

    /** RAZORPAY order: wallet payment must be rejected whichever side wins; the debit count stays zero. */
    protected void scenarioWalletPaymentRacingWebhookOnRazorpayOrder() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        AtomicReference<ProcessingResult> webhook = new AtomicReference<>();

        List<Throwable> outcomes = race(
                () -> walletOrderPaymentService.payOrderFromWallet(owner, order.getId(), new BigDecimal("120.00")),
                () -> webhook.set(capture(order, newId("evt"), newId("pay"), 12000)));

        assertThat(webhook.get()).isEqualTo(ProcessingResult.PAID);
        assertThat(outcomes.get(0)).as("wallet attempt must be rejected")
                .isInstanceOfAny(IllegalArgumentException.class, DuplicateTransactionException.class);
        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
        assertThat(successfulDebits(owner)).isZero();
        assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
    }

    // ---- Scenario D: repeated delivery ----

    protected void scenarioRepeatedDeliveryAfterPaid() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        String eventId = newId("evt");
        String paymentId = newId("pay");

        assertThat(capture(order, eventId, paymentId, 12000)).isEqualTo(ProcessingResult.PAID);
        assertThat(capture(order, eventId, paymentId, 12000)).isEqualTo(ProcessingResult.DUPLICATE);
        assertThat(capture(order, newId("evt"), paymentId, 12000)).isEqualTo(ProcessingResult.IGNORED);

        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
        assertThat(reload(order).getStatus()).isNotEqualTo(OrderStatus.CANCELLED);
        assertThat(reviewRecords(order)).isZero();
        assertThat(refundRecords(order)).isZero();
    }

    protected void scenarioRepeatedDeliveryAfterCancelled() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        cancel(order, owner);
        String eventId = newId("evt");
        String paymentId = newId("pay");

        assertThat(capture(order, eventId, paymentId, 12000)).isEqualTo(ProcessingResult.IGNORED);
        assertThat(capture(order, eventId, paymentId, 12000)).isEqualTo(ProcessingResult.DUPLICATE);
        assertThat(capture(order, newId("evt"), paymentId, 12000)).isEqualTo(ProcessingResult.IGNORED);
        String otherPaymentId = newId("pay");
        assertThat(capture(order, newId("evt"), otherPaymentId, 5000)).isEqualTo(ProcessingResult.IGNORED);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(reviewRecords(order)).as("one review record per provider payment").isEqualTo(2);
        assertThat(jdbcTemplate.queryForList(
                "SELECT amount FROM payment_events WHERE order_id = ? AND new_status = ? ORDER BY amount",
                BigDecimal.class, order.getId(), OrderService.PAYMENT_REVIEW_REQUIRED))
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("50.00"), new BigDecimal("120.00"));
        assertThat(refundRecords(order)).isZero();
    }

    // ---- Scenario F: cancellation racing a wallet payment (both lock the order row first) ----

    protected void scenarioCancellationRacingWalletPayment() {
        User owner = createUser();
        setBalance(owner, "500.00");
        Order order = createOrder(owner, "120.00", PaymentMethod.WALLET, "PENDING");

        List<Throwable> outcomes = race(
                () -> cancel(order, owner),
                () -> walletOrderPaymentService.payOrderFromWallet(owner, order.getId(), new BigDecimal("120.00")));

        assertThat(outcomes.get(0)).as("cancellation must complete").isNull();
        assertThat(reload(order).getStatus()).isEqualTo(OrderStatus.CANCELLED);
        if (outcomes.get(1) == null) {
            // Payment won the lock first: the cancellation refunds the debit back to the wallet.
            assertThat(successfulDebits(owner)).isEqualTo(1);
            assertThat(successfulCredits(owner)).as("cancellation refund credits the debit back").isEqualTo(1);
            assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
            assertThat(refundRecords(order)).isEqualTo(1);
        } else {
            // Cancellation won the lock: the payment re-reads CANCELLED and must not debit.
            assertThat(outcomes.get(1)).isInstanceOf(IllegalArgumentException.class);
            assertThat(successfulDebits(owner)).isZero();
            assertThat(successfulCredits(owner)).isZero();
            assertThat(balanceOf(owner)).isEqualByComparingTo("500.00");
            assertThat(paymentStatusOf(order)).isEqualTo("PENDING");
            assertThat(refundRecords(order)).isZero();
        }
    }

    // ---- Scenario G: a late capture on an order that was paid and later cancelled ----

    protected void scenarioCaptureAfterPaidThenCancelledIsReviewed() {
        User owner = createUser();
        Order order = createRazorpayOrder(owner, "120.00", "PENDING");
        String firstPayment = newId("pay");
        assertThat(capture(order, newId("evt"), firstPayment, 12000)).isEqualTo(ProcessingResult.PAID);
        cancel(order, owner);
        assertThat(refundRecords(order)).as("cancelling the paid order refunds the first payment").isEqualTo(1);
        String paymentStatusAfterCancel = paymentStatusOf(order);

        String latePayment = newId("pay");
        String lateEventId = newId("evt");
        assertThat(capture(order, lateEventId, latePayment, 5000)).isEqualTo(ProcessingResult.IGNORED);
        assertThat(capture(order, lateEventId, latePayment, 5000)).isEqualTo(ProcessingResult.DUPLICATE);
        assertThat(capture(order, newId("evt"), latePayment, 5000)).isEqualTo(ProcessingResult.IGNORED);
        assertThat(capture(order, newId("evt"), firstPayment, 12000)).as("the first payment is not a new capture")
                .isEqualTo(ProcessingResult.IGNORED);

        Order after = reload(order);
        assertThat(after.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(after.getPaymentStatus()).as("cancelled order is not resurrected").isEqualTo(paymentStatusAfterCancel);
        assertThat(reviewRecords(order)).as("one review record for the late capture").isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT amount FROM payment_events WHERE order_id = ? AND new_status = ?",
                BigDecimal.class, order.getId(), OrderService.PAYMENT_REVIEW_REQUIRED))
                .isEqualByComparingTo("50.00");
        assertThat(refundRecords(order)).as("no automatic refund for the late capture").isEqualTo(1);
    }

    // ---- Scenario E: signature-verification persistence ----

    protected void scenarioInvalidSignatureRecordsFailureWithoutCredit() {
        User user = createUser();
        setBalance(user, "0.00");
        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseThrow();
        String providerOrderId = newId("order_top");
        WalletTransaction pending = newPendingTopUp(wallet, providerOrderId, "500.00");

        VerifyPaymentRequest request = verifyRequest(providerOrderId, newId("pay"), "deadbeef");
        assertThatThrownBy(() -> walletService.verifyPaymentAndCredit(user, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid signature");

        assertThat(balanceOf(user)).isEqualByComparingTo("0.00");
        assertThat(txRepository.findById(pending.getId()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertThat(successfulCredits(user)).isZero();
    }

    protected void scenarioValidSignatureCreditsOnceAndRejectsReplay() {
        User user = createUser();
        setBalance(user, "0.00");
        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseThrow();
        String providerOrderId = newId("order_top");
        newPendingTopUp(wallet, providerOrderId, "500.00");
        String paymentId = newId("pay");
        VerifyPaymentRequest request = verifyRequest(providerOrderId, paymentId, sign(providerOrderId, paymentId));

        walletService.verifyPaymentAndCredit(user, request);

        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulCredits(user)).isEqualTo(1);

        assertThatThrownBy(() -> walletService.verifyPaymentAndCredit(user, request))
                .isInstanceOf(DuplicateTransactionException.class);
        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulCredits(user)).isEqualTo(1);
    }

    private WalletTransaction newPendingTopUp(Wallet wallet, String providerOrderId, String amount) {
        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setAmount(new BigDecimal(amount));
        tx.setType(TransactionType.CREDIT);
        tx.setStatus(TransactionStatus.PENDING);
        tx.setProviderOrderId(providerOrderId);
        tx.setCreatedAt(Instant.now());
        return txRepository.save(tx);
    }

    private static VerifyPaymentRequest verifyRequest(String orderId, String paymentId, String signature) {
        VerifyPaymentRequest request = new VerifyPaymentRequest();
        request.setRazorpayOrderId(orderId);
        request.setRazorpayPaymentId(paymentId);
        request.setRazorpaySignature(signature);
        return request;
    }

    private String sign(String orderId, String paymentId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign test payload", e);
        }
    }
}
