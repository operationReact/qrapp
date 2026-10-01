package com.broandbro.qrapp.service;

import com.broandbro.qrapp.repository.RazorpayWebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookService {

    private final RazorpayWebhookEventRepository eventRepository;
    private final OrderService orderService;

    @Transactional
    public ProcessingResult process(String eventId, String event, String paymentId, String orderId) {
        if (StringUtils.hasText(eventId)) {
            int claimed = eventRepository.claimEvent(eventId, event, orderId, paymentId);
            if (claimed == 0) {
                log.info("[Webhook] duplicate event ignored eventId={} event={}", eventId, event);
                return ProcessingResult.DUPLICATE;
            }
        }

        return switch (event) {
            case "payment.authorized", "payment.captured", "order.paid" -> {
                if (StringUtils.hasText(orderId)) {
                    orderService.markOrderPaidByRazorpayOrderId(orderId);
                    yield ProcessingResult.PAID;
                }
                log.info("[Webhook] event={} has no order ID; acknowledged without business update", event);
                yield ProcessingResult.IGNORED;
            }
            case "payment.failed", "payment.pending", "payment.refunded" -> {
                log.info("[Webhook] event={} received; no state transition configured", event);
                yield ProcessingResult.IGNORED;
            }
            default -> {
                log.info("[Webhook] event={} received; unsupported event acknowledged", event);
                yield ProcessingResult.IGNORED;
            }
        };
    }

    public enum ProcessingResult {
        PAID, IGNORED, DUPLICATE
    }
}
