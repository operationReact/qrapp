package com.broandbro.qrapp.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Runs the wallet checkout-safety scenarios on H2 (PostgreSQL mode).
 * H2 does not prove PostgreSQL row-lock semantics; see WalletCheckoutSafetyPostgresIT.
 */
@SpringBootTest
@ActiveProfiles("test")
class WalletCheckoutSafetyH2Test extends WalletCheckoutSafetyTestBase {

    @Test
    void concurrentDebitsCannotOverspend() {
        scenarioConcurrentDebitsCannotOverspend();
    }

    @Test
    void concurrentPaymentsForSameOrderDebitOnce() {
        scenarioConcurrentPaymentsForSameOrderDebitOnce();
    }

    @Test
    void orderUpdateFailureRollsBackDebit() {
        scenarioOrderUpdateFailureRollsBackDebit();
    }

    @Test
    void payingAnotherUsersOrderIsRejected() {
        scenarioPayingAnotherUsersOrderIsRejected();
    }

    @Test
    void alreadyPaidOrderIsRejected() {
        scenarioAlreadyPaidOrderIsRejected();
    }

    @Test
    void clientAmountMustMatchOrderTotal() {
        scenarioClientAmountMustMatchOrderTotal();
    }

    @Test
    void nonWalletOrderIsRejected() {
        scenarioNonWalletOrderIsRejected();
    }

    @Test
    void concurrentRefundsOnNewWalletDoNotLoseUpdates() {
        scenarioConcurrentRefundsOnNewWalletDoNotLoseUpdates();
    }

    @Test
    void walletCacheEvictedOnlyAfterCommit() {
        scenarioWalletCacheEvictedOnlyAfterCommit();
    }

    @Test
    void concurrentWalletCreationReturnsSingleWallet() {
        scenarioConcurrentWalletCreationReturnsSingleWallet();
    }

    @Test
    void lazyWalletCreationRollsBackWithCallerTransaction() {
        scenarioLazyWalletCreationRollsBackWithCallerTransaction();
    }
}
