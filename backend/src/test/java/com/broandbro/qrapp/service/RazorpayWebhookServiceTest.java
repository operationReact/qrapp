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

    @Mock
    private RefundService refundService;

    @Test
    void successfulPaymentEventMarksOrderPaid() {
        when(eventRepository.claimEvent("evt_1", "payment.captured", "order_1", "pay_1"))
                .thenReturn(1);
        when(orderService.markOrderPaidByRazorpayOrderId("order_1", "pay_1", 15000L)).thenReturn(true);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);

        assertThat(service.process("evt_1", "payment.captured", "pay_1", "order_1", 15000L))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.PAID);
        verify(orderService).markOrderPaidByRazorpayOrderId("order_1", "pay_1", 15000L);
    }

    @Test
    void capturedPaymentThatCannotBeAppliedIsNotReportedAsPaid() {
        when(eventRepository.claimEvent("evt_5", "payment.captured", "order_1", "pay_1"))
                .thenReturn(1);
        when(orderService.markOrderPaidByRazorpayOrderId("order_1", "pay_1", 15000L)).thenReturn(false);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);

        assertThat(service.process("evt_5", "payment.captured", "pay_1", "order_1", 15000L))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.IGNORED);
    }

    @Test
    void duplicateEventDoesNotReachPaymentProcessing() {
        when(eventRepository.claimEvent("evt_1", "payment.captured", "order_1", "pay_1"))
                .thenReturn(0);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);

        assertThat(service.process("evt_1", "payment.captured", "pay_1", "order_1", 15000L))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.DUPLICATE);
        verify(orderService, never()).markOrderPaidByRazorpayOrderId("order_1", "pay_1", 15000L);
    }

    @Test
    void unknownEventIsAcknowledgedWithoutPaymentUpdate() {
        when(eventRepository.claimEvent("evt_2", "refund.created", null, null))
                .thenReturn(1);

        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);

        assertThat(service.process("evt_2", "refund.created", null, null, null))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.IGNORED);
        verify(orderService, never()).markOrderPaidByRazorpayOrderId("order_1", "pay_1", 15000L);
    }

    @Test
    void refundEventIsDeduplicatedBeforeReachingRefundService() {
        when(eventRepository.claimEvent("evt_3", "refund.processed", null, "pay_9")).thenReturn(0);
        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);
        RefundService.ProviderRefundUpdate update =
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_1", "order-3-cancel", "pay_9", 15000L);

        assertThat(service.processRefundEvent("evt_3", "refund.processed", update))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.DUPLICATE);
        verify(refundService, never()).applyProviderRefundEvent(update);
    }

    @Test
    void refundEventIsAppliedOnce() {
        when(eventRepository.claimEvent("evt_4", "refund.processed", null, "pay_9")).thenReturn(1);
        RazorpayWebhookService service = new RazorpayWebhookService(eventRepository, orderService, refundService);
        RefundService.ProviderRefundUpdate update =
                new RefundService.ProviderRefundUpdate("refund.processed", "rfnd_1", "order-3-cancel", "pay_9", 15000L);
        when(refundService.applyProviderRefundEvent(update)).thenReturn(true);

        assertThat(service.processRefundEvent("evt_4", "refund.processed", update))
                .isEqualTo(RazorpayWebhookService.ProcessingResult.REFUND_UPDATED);
    }
}
