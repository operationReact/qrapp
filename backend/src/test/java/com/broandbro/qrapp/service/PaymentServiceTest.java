package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private RazorpayService razorpayService;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    void createRazorpayOrderUsesLiveRazorpayService() {
        Order order = new Order();
        order.setId(42L);

        when(razorpayService.createOrder(15000L, "INR", "order_42")).thenReturn("order_live_42");
        when(razorpayService.getKeyId()).thenReturn("rzp_live_123");
        when(razorpayService.isEnabled()).thenReturn(true);
        when(orderRepository.findById(42L)).thenReturn(Optional.of(order));

        Map<String, Object> result = paymentService.createRazorpayOrder(42L, 15000);

        assertThat(result).containsEntry("rzpOrderId", "order_live_42");
        assertThat(result).containsEntry("key", "rzp_live_123");
        assertThat(result).containsEntry("secretSet", true);
        assertThat(result.get("rzpOrderId")).asString().doesNotStartWith("mock_rzp_");
        assertThat(order.getRazorpayOrderId()).isEqualTo("order_live_42");
        verify(orderRepository).save(order);
    }

    @Test
    void createRazorpayOrderFailsFastWhenRazorpayIsNotConfigured() {
        when(razorpayService.createOrder(15000L, "INR", "order_42"))
                .thenThrow(new IllegalStateException("Razorpay is not configured. Set razorpay.key and razorpay.secret to enable payments."));

        assertThatThrownBy(() -> paymentService.createRazorpayOrder(42L, 15000))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Razorpay is not configured");

        verify(orderRepository, never()).findById(42L);
        verify(orderRepository, never()).save(org.mockito.ArgumentMatchers.any(Order.class));
    }
}

