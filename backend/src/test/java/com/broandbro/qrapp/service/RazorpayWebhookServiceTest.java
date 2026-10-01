package com.broandbro.qrapp.service;

import com.broandbro.qrapp.repository.RazorpayWebhookEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RazorpayWebhookServiceTest {

    @Mock
    private RazorpayWebhookEventRepository eventRepository;

    @Mock
    private OrderService orderService;

    @Test
    void successfulPaymentEventMarksOrderPaid() {
        when(eventRepository.claimEvent("evt_1", "payment.captured", "order_1", "pay_1"))
                .thenReturn(1);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService);

        assertThat(service.process("evt_1", "payment.captured", "pay_1", "order_1"))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.PAID);
        verify(orderService).markOrderPaidByRazorpayOrderId("order_1");
    }

    @Test
    void duplicateEventDoesNotReachPaymentProcessing() {
        when(eventRepository.claimEvent("evt_1", "payment.captured", "order_1", "pay_1"))
                .thenReturn(0);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService);

        assertThat(service.process("evt_1", "payment.captured", "pay_1", "order_1"))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.DUPLICATE);
        verify(orderService, never()).markOrderPaidByRazorpayOrderId("order_1");
    }

    @Test
    void unknownEventIsAcknowledgedWithoutPaymentUpdate() {
        when(eventRepository.claimEvent("evt_2", "refund.created", null, null))
                .thenReturn(1);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService);

        assertThat(service.process("evt_2", "refund.created", null, null))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.IGNORED);
        verify(orderService, never()).markOrderPaidByRazorpayOrderId("order_1");
    }
}
