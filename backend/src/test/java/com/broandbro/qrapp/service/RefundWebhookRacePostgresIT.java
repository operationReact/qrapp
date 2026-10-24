package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderRefund;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.OrderRefundRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Webhook-versus-refund races on real PostgreSQL row locks. Skipped unless QRAPP_IT_PG_URL is set.
 * Provider calls are controlled with latches; the webhook and refund services are the production beans.
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "QRAPP_IT_PG_URL", matches = ".+")
class RefundWebhookRacePostgresIT extends OrderPaymentRaceTestBase {

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("QRAPP_IT_PG_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("QRAPP_IT_PG_USER", "postgres"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("QRAPP_IT_PG_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @MockitoSpyBean
    protected RazorpayService razorpayService;

    @Autowired
    protected OrderRefundRepository orderRefundRepository;

    private Order cancelledRazorpayOrder(User owner) {
        Order order = createRazorpayOrder(owner, "120.00", "PAID");
        order.setRazorpayPaymentId("pay_" + UUID.randomUUID());
        orderRepository.save(order);
        cancel(order, owner);
        return reload(order);
    }

    private User ownerWithWallet() {
        User owner = createUser();
        walletService.getOrCreateWallet(owner);
        return owner;
    }

    private OrderRefund refundOf(Order order) {
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM order_refunds WHERE order_id = ?", Long.class, order.getId());
        return orderRefundRepository.findById(id).orElseThrow();
    }

    private void setRefundState(OrderRefund refund, String status, String providerRefundId) {
        OrderRefund entity = orderRefundRepository.findById(refund.getId()).orElseThrow();
        entity.setStatus(status);
        entity.setProviderRefundId(providerRefundId);
        orderRefundRepository.save(entity);
    }

    private long claimsFor(String eventId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM razorpay_webhook_events WHERE event_id = ?", Long.class, eventId);
    }

    private static String newEventId() {
        return "evt_" + UUID.randomUUID();
    }

    @Test
    void webhookArrivingDuringProviderCallKeepsProviderIdAndSingleRefund() throws Exception {
        User owner = ownerWithWallet();
        Order order = cancelledRazorpayOrder(owner);
        OrderRefund refund = refundOf(order);
        String paymentId = refund.getPaymentId();
        String key = refund.getIdempotencyKey();
        long creditsBefore = successfulCredits(owner);

        CountDownLatch inProviderCall = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doCallRealMethod().when(refundService).processRefund(anyLong());
        doAnswer(inv -> {
            inProviderCall.countDown();
            release.await(30, TimeUnit.SECONDS);
            return "rfnd_race1";
        }).when(razorpayService).refundPayment(any(), anyLong(), any());

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            Future<?> processing = pool.submit(() -> {
                refundService.processRefund(refund.getId());
                return null;
            });
            assertThat(inProviderCall.await(30, TimeUnit.SECONDS)).isTrue();

            RazorpayWebhookService.ProcessingResult result = webhookService.processRefundEvent(
                    newEventId(), "refund.processed",
                    new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_race1", key, paymentId, 12000L));
            release.countDown();
            processing.get(30, TimeUnit.SECONDS);

            assertThat(result).isEqualTo(RazorpayWebhookService.ProcessingResult.REFUND_UPDATED);
        } finally {
            release.countDown();
            pool.shutdownNow();
        }

        OrderRefund after = orderRefundRepository.findById(refund.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(OrderRefund.STATUS_PROCESSED_BY_GATEWAY);
        assertThat(after.getProviderRefundId()).as("provider id written by the webhook must survive the late accept")
                .isEqualTo("rfnd_race1");
        assertThat(refundRecords(order)).isEqualTo(1);
        verify(razorpayService, times(1)).refundPayment(any(), anyLong(), any());
        assertThat(successfulCredits(owner)).as("webhooks never credit wallets").isEqualTo(creditsBefore);
    }

    @Test
    void processedAndBankCreditWebhooksRacingSettleToSucceededInEitherOrder() {
        for (int round = 0; round < 5; round++) {
            User owner = ownerWithWallet();
            Order order = cancelledRazorpayOrder(owner);
            OrderRefund refund = refundOf(order);
            String providerId = "rfnd_round" + round + "_" + UUID.randomUUID().toString().substring(0, 8);
            setRefundState(refund, OrderRefund.STATUS_PROVIDER_ACCEPTED, providerId);
            String key = refund.getIdempotencyKey();
            String paymentId = refund.getPaymentId();
            long creditsBefore = successfulCredits(owner);
            String arn = "ARN" + round;

            java.util.Queue<RazorpayWebhookService.ProcessingResult> results = new java.util.concurrent.ConcurrentLinkedQueue<>();
            List<Throwable> outcomes = race(
                    () -> results.add(webhookService.processRefundEvent(newEventId(), "refund.processed",
                            new RefundService.ProviderRefundUpdate("refund.processed", providerId, key, paymentId, 12000L))),
                    () -> results.add(webhookService.processRefundEvent(newEventId(), "refund.speed_changed",
                            new RefundService.ProviderRefundUpdate("refund.speed_changed", providerId, key, paymentId,
                                    12000L, "normal", "normal", arn))));

            assertThat(failures(outcomes)).as("round %s must not deadlock or fail", round).isZero();
            assertThat(results).as("round %s: both webhooks must match the refund row", round)
                    .containsOnly(RazorpayWebhookService.ProcessingResult.REFUND_UPDATED);
            OrderRefund after = orderRefundRepository.findById(refund.getId()).orElseThrow();
            assertThat(after.getAcquirerArn()).as("round %s acquirer ARN", round).isEqualTo(arn);
            assertThat(after.getProviderRefundId()).as("round %s provider id", round).isEqualTo(providerId);
            assertThat(after.getStatus()).as("round %s", round).isEqualTo(OrderRefund.STATUS_SUCCEEDED);
            assertThat(successfulCredits(owner)).as("round %s", round).isEqualTo(creditsBefore);
        }
    }

    @Test
    void rolledBackWebhookReleasesEventClaimAndRedeliveryApplies() {
        User owner = ownerWithWallet();
        Order order = cancelledRazorpayOrder(owner);
        OrderRefund refund = refundOf(order);
        setRefundState(refund, OrderRefund.STATUS_PROVIDER_ACCEPTED, "rfnd_dup");
        String eventId = newEventId();
        RefundService.ProviderRefundUpdate update = new RefundService.ProviderRefundUpdate(
                "refund.processed", "rfnd_dup", refund.getIdempotencyKey(), refund.getPaymentId(), 12000L);

        doThrow(new IllegalStateException("simulated failure after the event claim"))
                .doCallRealMethod()
                .when(refundService).applyProviderRefundEvent(any());

        assertThatThrownBy(() -> webhookService.processRefundEvent(eventId, "refund.processed", update))
                .isInstanceOf(IllegalStateException.class);
        assertThat(claimsFor(eventId)).as("rollback must release the event claim").isZero();
        assertThat(orderRefundRepository.findById(refund.getId()).orElseThrow().getStatus())
                .isEqualTo(OrderRefund.STATUS_PROVIDER_ACCEPTED);

        assertThat(webhookService.processRefundEvent(eventId, "refund.processed", update))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.REFUND_UPDATED);
        assertThat(webhookService.processRefundEvent(eventId, "refund.processed", update))
                .as("a redelivered event after a successful apply is a duplicate")
                .isEqualTo(RazorpayWebhookService.ProcessingResult.DUPLICATE);

        OrderRefund after = orderRefundRepository.findById(refund.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(OrderRefund.STATUS_PROCESSED_BY_GATEWAY);
        assertThat(after.getProviderRefundId()).isEqualTo("rfnd_dup");
        assertThat(claimsFor(eventId)).isEqualTo(1);
    }

    @Test
    void webhookNamingDifferentProviderRefundEscalatesWithoutOverwritingRecordedId() {
        User owner = ownerWithWallet();
        Order order = cancelledRazorpayOrder(owner);
        OrderRefund refund = refundOf(order);
        setRefundState(refund, OrderRefund.STATUS_PROVIDER_ACCEPTED, "rfnd_first");

        assertThat(webhookService.processRefundEvent(newEventId(), "refund.processed",
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_second",
                        refund.getIdempotencyKey(), refund.getPaymentId(), 12000L)))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.REFUND_UPDATED);

        OrderRefund after = orderRefundRepository.findById(refund.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(OrderRefund.STATUS_MANUAL_REQUIRED);
        assertThat(after.getProviderRefundId()).isEqualTo("rfnd_first");
    }
}
