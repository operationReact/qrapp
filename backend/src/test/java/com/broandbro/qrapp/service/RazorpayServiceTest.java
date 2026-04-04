package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RazorpayServiceTest {

    @Test
    void createOrderUsesMockModeWhenCredentialsArePlaceholders() {
        RazorpayProperties properties = new RazorpayProperties();
        properties.setKey("YOUR_KEY");
        properties.setSecret("YOUR_SECRET");

        RazorpayService service = new RazorpayService(properties, new MockEnvironment());

        String orderId = service.createOrder(5000L, "INR", "wallet_test_receipt");

        assertThat(service.isEnabled()).isFalse();
        assertThat(service.isMockModeEnabled()).isTrue();
        assertThat(service.isMockOrderId(orderId)).isTrue();
        assertThat(service.verifySignature(orderId, "mock_pay_123", "mock_signature")).isTrue();
    }

    @Test
    void createOrderFallsBackToMockWhenLiveOrderCreationFailsOutsideProduction() {
        RazorpayProperties properties = new RazorpayProperties();
        properties.setKey("rzp_test_bad_key");
        properties.setSecret("rzp_test_bad_secret");

        RazorpayService service = new RazorpayService(properties, new MockEnvironment()) {
            @Override
            protected String createLiveOrder(Long amount, String currency, String receipt) {
                throw new RuntimeException("Simulated Razorpay failure");
            }
        };

        String orderId = service.createOrder(5000L, "INR", "wallet_test_receipt");

        assertThat(service.isEnabled()).isTrue();
        assertThat(service.isMockOrderId(orderId)).isTrue();
    }

    @Test
    void createOrderDoesNotUseMockFallbackInProductionWhenCredentialsAreMissing() {
        RazorpayProperties properties = new RazorpayProperties();
        MockEnvironment environment = new MockEnvironment();
        environment.addActiveProfile("prod");

        RazorpayService service = new RazorpayService(properties, environment);

        assertThatThrownBy(() -> service.createOrder(5000L, "INR", "wallet_test_receipt"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Razorpay is not configured");
    }
}

