package com.broandbro.qrapp.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Order/webhook/cancellation race scenarios on real PostgreSQL row locks.
 * Skipped unless QRAPP_IT_PG_URL is set (same contract as WalletCheckoutSafetyPostgresIT).
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "QRAPP_IT_PG_URL", matches = ".+")
class OrderPaymentRacePostgresIT extends OrderPaymentRaceTestBase {

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("QRAPP_IT_PG_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("QRAPP_IT_PG_USER", "postgres"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("QRAPP_IT_PG_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @Test
    void cancellationRacingCapturedWebhook() {
        scenarioCancellationRacingCapturedWebhook();
    }

    @Test
    void webhookRacingWebhookPaysOnce() {
        scenarioWebhookRacingWebhookPaysOnce();
    }

    @Test
    void walletPaymentRacingWebhookOnWalletOrder() {
        scenarioWalletPaymentRacingWebhookOnWalletOrder();
    }

    @Test
    void walletPaymentRacingWebhookOnRazorpayOrder() {
        scenarioWalletPaymentRacingWebhookOnRazorpayOrder();
    }

    @Test
    void repeatedDeliveryAfterPaid() {
        scenarioRepeatedDeliveryAfterPaid();
    }

    @Test
    void repeatedDeliveryAfterCancelled() {
        scenarioRepeatedDeliveryAfterCancelled();
    }

    @Test
    void cancellationRacingWalletPayment() {
        scenarioCancellationRacingWalletPayment();
    }

    @Test
    void captureAfterPaidThenCancelledIsReviewed() {
        scenarioCaptureAfterPaidThenCancelledIsReviewed();
    }

    @Test
    void invalidSignatureRecordsFailureWithoutCredit() {
        scenarioInvalidSignatureRecordsFailureWithoutCredit();
    }

    @Test
    void validSignatureCreditsOnceAndRejectsReplay() {
        scenarioValidSignatureCreditsOnceAndRejectsReplay();
    }
}
