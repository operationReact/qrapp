package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RazorpayServiceTest {

    @Test
    void createOrderFailsWhenCredentialsArePlaceholders() {
        RazorpayProperties properties = new RazorpayProperties();
        properties.setKey("YOUR_KEY");
        properties.setSecret("YOUR_SECRET");

        RazorpayService service = new RazorpayService(properties, new MockEnvironment());

        assertThat(service.isEnabled()).isFalse();
        assertThatThrownBy(() -> service.createOrder(5000L, "INR", "wallet_test_receipt"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Razorpay is not configured");
        assertThat(service.verifySignature("order_test_123", "pay_test_123", "sig_test_123")).isFalse();
    }

    @Test
    void createOrderFailsWhenLiveOrderCreationFailsOutsideProduction() {
        RazorpayProperties properties = new RazorpayProperties();
        properties.setKey("rzp_test_bad_key");
        properties.setSecret("rzp_test_bad_secret");

        RazorpayService service = new RazorpayService(properties, new MockEnvironment()) {
            @Override
            protected String createLiveOrder(Long amount, String currency, String receipt) {
                throw new RuntimeException("Simulated Razorpay failure");
            }
        };

        assertThat(service.isEnabled()).isTrue();
        assertThatThrownBy(() -> service.createOrder(5000L, "INR", "wallet_test_receipt"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to create Razorpay order")
                .hasCauseInstanceOf(RuntimeException.class);
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

