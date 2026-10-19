package com.broandbro.qrapp.service;

/** Published inside the cancellation transaction; the provider refund starts only after that transaction commits. */
public record RefundRequestedEvent(Long refundId) {
}
