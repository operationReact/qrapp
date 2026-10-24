package com.broandbro.qrapp.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Signature-verification scenarios on H2 (PostgreSQL mode).
 * The webhook scenarios are not run here: RazorpayWebhookEventRepository.claimEvent uses
 * INSERT ... ON CONFLICT, which H2 rejects. They run only against PostgreSQL in OrderPaymentRacePostgresIT.
 */
@SpringBootTest
@ActiveProfiles("test")
class OrderPaymentRaceH2Test extends OrderPaymentRaceTestBase {

    @Test
    void cancellationRacingWalletPayment() {
        scenarioCancellationRacingWalletPayment();
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
