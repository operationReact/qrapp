package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderRefund;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.OrderRefundRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.time.BusinessTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Owns money movement for cancelled orders.
 *
 * <p>Cancellation only records the intent (an {@link OrderRefund} row with a deterministic idempotency key)
 * inside the cancellation transaction. Provider calls happen after commit, so a rolled-back cancellation never
 * moves money, and a committed cancellation is never left without a durable refund record.
 * Ambiguous provider outcomes are reconciled by refund key before any retry, so a refund is never issued twice.
 */
@Service
public class RefundService {
    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    static final int MAX_ATTEMPTS = 5;
    static final Duration PROCESSING_LEASE = Duration.ofMinutes(5);

    static final String ORDER_REFUND_NOT_REQUIRED = "NOT_REQUIRED";
    static final String ORDER_REFUND_PENDING = "PENDING";
    static final String ORDER_REFUND_REFUNDED = "REFUNDED";
    static final String ORDER_REFUND_MANUAL_REQUIRED = "MANUAL_REQUIRED";

    /** Statuses a webhook may still settle. PROVIDER_ACCEPTED rows have no retry timer, so the sweeper never picks them up. */
    private static final List<String> ACTIVE_STATUSES =
            List.of(OrderRefund.STATUS_PENDING, OrderRefund.STATUS_FAILED, OrderRefund.STATUS_PROCESSING,
                    OrderRefund.STATUS_PROVIDER_ACCEPTED);

    private final OrderRefundRepository refundRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepository;
    private final RazorpayService razorpayService;
    private final WalletService walletService;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate requiresNewTx;
    private final TransactionTemplate tx;

    public RefundService(OrderRefundRepository refundRepo,
                         OrderRepository orderRepo,
                         UserRepository userRepository,
                         RazorpayService razorpayService,
                         WalletService walletService,
                         ApplicationEventPublisher eventPublisher,
                         PlatformTransactionManager transactionManager) {
        this.refundRepo = refundRepo;
        this.orderRepo = orderRepo;
        this.userRepository = userRepository;
        this.razorpayService = razorpayService;
        this.walletService = walletService;
        this.eventPublisher = eventPublisher;
        this.tx = new TransactionTemplate(transactionManager);
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Records the refund for a cancelled order. Must run inside the cancellation transaction, so the order
     * status change and the refund record commit or roll back together.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void initiateCancellationRefund(Order order, LocalDateTime now) {
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            order.setRefundStatus(ORDER_REFUND_NOT_REQUIRED);
            return;
        }

        String key = "order-" + order.getId() + "-cancel";
        Optional<OrderRefund> existing = refundRepo.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            applyOrderRefundStatus(order, existing.get());
            return;
        }

        BigDecimal amount = order.getGrandTotal() == null
                ? BigDecimal.ZERO
                : order.getGrandTotal().setScale(2, RoundingMode.HALF_UP);
        order.setRefundAmount(amount);

        OrderRefund refund = new OrderRefund();
        refund.setOrderId(order.getId());
        refund.setAmount(amount);
        refund.setIdempotencyKey(key);
        refund.setAttempts(0);
        refund.setCreatedAt(now);
        refund.setUpdatedAt(now);

        PaymentMethod method = order.getPaymentMethod();
        if (method == PaymentMethod.WALLET && order.getUserId() != null) {
            User owner = userRepository.findById(order.getUserId())
                    .orElseThrow(() -> new IllegalStateException("Wallet owner not found for order " + order.getId()));
            refund.setMethod(OrderRefund.METHOD_WALLET);
            refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
            refund.setCompletedAt(now);
            refund.setProviderRefundId(walletService.creditOrderRefund(owner, order.getId(), amount));
        } else if (method == PaymentMethod.RAZORPAY && order.getRazorpayPaymentId() != null) {
            refund.setMethod(OrderRefund.METHOD_RAZORPAY);
            refund.setStatus(OrderRefund.STATUS_PENDING);
            refund.setPaymentId(order.getRazorpayPaymentId());
            refund.setNextAttemptAt(now);
        } else {
            refund.setMethod(OrderRefund.METHOD_MANUAL);
            refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
            log.warn("[Refund] Manual refund required | orderId={} orderNumber={} paymentMethod={} razorpayPaymentId={}",
                    order.getId(), order.getOrderNumber(), method, order.getRazorpayPaymentId());
        }

        refundRepo.save(refund);
        applyOrderRefundStatus(order, refund);
        if (OrderRefund.STATUS_PENDING.equals(refund.getStatus())) {
            eventPublisher.publishEvent(new RefundRequestedEvent(refund.getId()));
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRefundRequested(RefundRequestedEvent event) {
        processRefund(event.refundId());
    }

    /** Safety net: picks up refunds whose immediate attempt failed or whose process died mid-flight. */
    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void sweepDueRefunds() {
        LocalDateTime now = BusinessTime.now();
        refundRepo.findTop50ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(ACTIVE_STATUSES, now)
                .forEach(refund -> processRefund(refund.getId()));
    }

    /** Attempts a refund once. Never throws; every outcome is recorded on the refund row. */
    public void processRefund(Long refundId) {
        OrderRefund claimed;
        try {
            claimed = requiresNewTx.execute(status -> claim(refundId));
        } catch (RuntimeException e) {
            log.error("[Refund] Could not claim refund | refundId={}", refundId, e);
            return;
        }
        if (claimed != null) {
            attempt(claimed);
        }
    }

    private OrderRefund claim(Long refundId) {
        LocalDateTime now = BusinessTime.now();
        int claimedRows = refundRepo.claimForAttempt(refundId, now, now.plus(PROCESSING_LEASE), MAX_ATTEMPTS);
        if (claimedRows == 1) {
            return refundRepo.findById(refundId).orElse(null);
        }
        if (refundRepo.escalateIfExhausted(refundId, now, MAX_ATTEMPTS) == 1) {
            OrderRefund escalated = refundRepo.findById(refundId).orElseThrow();
            orderRepo.findByIdForUpdate(escalated.getOrderId())
                    .ifPresent(order -> applyOrderRefundStatus(order, escalated));
            log.error("[Refund] Automatic retries exhausted; manual verification required | refundId={} orderId={}",
                    refundId, escalated.getOrderId());
        }
        return null;
    }

    private void attempt(OrderRefund refund) {
        Long id = refund.getId();
        try {
            markProviderAccepted(id, obtainProviderRefundId(refund));
        } catch (RazorpayService.RefundException e) {
            if (e.isDefinite()) {
                markFailed(id, e.getMessage());
            } else {
                markAmbiguous(id, e.getMessage());
            }
        } catch (RuntimeException e) {
            // Includes failures to write the success record. The row keeps its lease, so the next attempt
            // reconciles by refund key instead of refunding again.
            log.error("[Refund] Outcome unknown; will reconcile on retry | refundId={}", id, e);
            markAmbiguous(id, e.getMessage());
        }
    }

    private String obtainProviderRefundId(OrderRefund refund) {
        if (refund.getAttempts() > 1) {
            Optional<String> prior = razorpayService.findRefundIdByKey(refund.getPaymentId(), refund.getIdempotencyKey());
            if (prior.isPresent()) {
                log.info("[Refund] Reconciled existing provider refund | refundId={} providerRefundId={}",
                        refund.getId(), prior.get());
                return prior.get();
            }
        }
        long amountPaise = refund.getAmount().movePointRight(2).longValueExact();
        return razorpayService.refundPayment(refund.getPaymentId(), amountPaise, refund.getIdempotencyKey());
    }

    /**
     * Razorpay accepting the refund does not mean the bank has credited it (that can take up to 7 working days),
     * so the row stays open until the refund.processed webhook confirms it.
     */
    private void markProviderAccepted(Long refundId, String providerRefundId) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findById(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                    || OrderRefund.STATUS_MANUAL_REQUIRED.equals(refund.getStatus())) {
                // A webhook or admin already settled this row before our write landed; never downgrade it.
                return;
            }
            LocalDateTime now = BusinessTime.now();
            refund.setProviderRefundId(providerRefundId);
            refund.setNextAttemptAt(null);
            refund.setFailureReason(null);
            refund.setUpdatedAt(now);
            if (OrderRefund.STATUS_FAILED.equals(refund.getStatus())) {
                // refund.failed arrived before this write. The provider refund exists, so a resend could duplicate it.
                refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
                refund.setFailureReason(truncate("Razorpay reported the refund as failed; verify on the Razorpay dashboard"));
                orderRepo.findByIdForUpdate(refund.getOrderId())
                        .ifPresent(order -> applyOrderRefundStatus(order, refund));
                return;
            }
            refund.setStatus(OrderRefund.STATUS_PROVIDER_ACCEPTED);
            orderRepo.findByIdForUpdate(refund.getOrderId())
                    .ifPresent(order -> applyOrderRefundStatus(order, refund));
            log.info("[Refund] Accepted by Razorpay; awaiting bank credit | refundId={} providerRefundId={}",
                    refundId, providerRefundId);
        });
    }

    private void markFailed(Long refundId, String reason) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findById(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())) {
                return;
            }
            LocalDateTime now = BusinessTime.now();
            refund.setStatus(OrderRefund.STATUS_FAILED);
            refund.setFailureReason(truncate(reason));
            refund.setNextAttemptAt(now.plus(backoff(refund.getAttempts())));
            refund.setUpdatedAt(now);
            log.warn("[Refund] Provider rejected refund; will retry | refundId={} attempts={} reason={}",
                    refundId, refund.getAttempts(), reason);
        });
    }

    private void markAmbiguous(Long refundId, String reason) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findById(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())) {
                return;
            }
            // Status stays PROCESSING and nextAttemptAt keeps the lease, so the sweeper retries only after the lease expires.
            refund.setStatus(OrderRefund.STATUS_PROCESSING);
            refund.setFailureReason(truncate(reason));
            refund.setUpdatedAt(BusinessTime.now());
        });
    }

    /** Refund details extracted from a Razorpay refund webhook. {@code amountPaise} may be null when absent. */
    public record ProviderRefundUpdate(String event, String providerRefundId, String refundKey,
                                       String paymentId, Long amountPaise) {}

    /**
     * Applies a Razorpay refund webhook to our refund record. Returns false when the refund was not issued by us.
     * The order row is locked, matching cancellation and admin writes, so the two never interleave.
     */
    @Transactional
    public boolean applyProviderRefundEvent(ProviderRefundUpdate update) {
        Optional<OrderRefund> match = findRefundForEvent(update);
        if (match.isEmpty()) {
            log.info("[Refund] Webhook refund not linked to an order | event={} providerRefundId={} paymentId={}",
                    update.event(), update.providerRefundId(), update.paymentId());
            return false;
        }
        OrderRefund refund = match.get();
        Order order = orderRepo.findByIdForUpdate(refund.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Order not found for refund " + refund.getId()));
        LocalDateTime now = BusinessTime.now();

        switch (update.event()) {
            case "refund.processed" -> markSucceededFromProvider(refund, order, update.providerRefundId(), now);
            case "refund.failed" -> markFailedFromProvider(refund, order, now);
            case "refund.created" -> {
                if (refund.getProviderRefundId() == null && update.providerRefundId() != null) {
                    refund.setProviderRefundId(update.providerRefundId());
                }
            }
            default -> log.info("[Refund] Webhook event acknowledged without state change | event={} refundId={}",
                    update.event(), refund.getId());
        }
        refund.setUpdatedAt(now);
        return true;
    }

    private void markSucceededFromProvider(OrderRefund refund, Order order, String providerRefundId, LocalDateTime now) {
        if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())) {
            // Keep the first recorded reference (for example, one entered by an admin on manual completion).
            if (refund.getProviderRefundId() == null) {
                refund.setProviderRefundId(providerRefundId);
            }
            return;
        }
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        refund.setProviderRefundId(providerRefundId != null ? providerRefundId : refund.getProviderRefundId());
        refund.setCompletedAt(now);
        refund.setNextAttemptAt(null);
        refund.setFailureReason(null);
        applyOrderRefundStatus(order, refund);
        log.info("[Refund] Confirmed by Razorpay webhook | refundId={} orderId={} providerRefundId={}",
                refund.getId(), refund.getOrderId(), providerRefundId);
    }

    private void markFailedFromProvider(OrderRefund refund, Order order, LocalDateTime now) {
        if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                || OrderRefund.STATUS_MANUAL_REQUIRED.equals(refund.getStatus())) {
            log.info("[Refund] Ignoring failed webhook for settled refund | refundId={} status={}",
                    refund.getId(), refund.getStatus());
            return;
        }
        if (OrderRefund.STATUS_PROVIDER_ACCEPTED.equals(refund.getStatus())) {
            // Razorpay accepted this refund earlier; an automatic resend could pay the customer twice.
            refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
            refund.setFailureReason(truncate("Razorpay reported the accepted refund as failed; verify on the Razorpay dashboard"));
            refund.setNextAttemptAt(null);
            applyOrderRefundStatus(order, refund);
            log.warn("[Refund] Accepted refund later failed; manual verification required | refundId={}", refund.getId());
            return;
        }
        refund.setStatus(OrderRefund.STATUS_FAILED);
        refund.setFailureReason(truncate("Razorpay reported the refund as failed"));
        refund.setNextAttemptAt(now.plus(backoff(refund.getAttempts())));
        applyOrderRefundStatus(order, refund);
        log.warn("[Refund] Confirmed failed by Razorpay webhook; will retry | refundId={} attempts={}",
                refund.getId(), refund.getAttempts());
    }

    private Optional<OrderRefund> findRefundForEvent(ProviderRefundUpdate update) {
        if (update.refundKey() != null && !update.refundKey().isBlank()) {
            return refundRepo.findByIdempotencyKey(update.refundKey());
        }
        if (update.providerRefundId() != null) {
            Optional<OrderRefund> byProviderId = refundRepo.findFirstByProviderRefundId(update.providerRefundId());
            if (byProviderId.isPresent()) {
                return byProviderId;
            }
        }
        // Last resort for refunds without our notes: match only an open refund of the same payment and amount.
        if (update.paymentId() == null || update.amountPaise() == null) {
            return Optional.empty();
        }
        return refundRepo.findByPaymentIdAndStatusIn(update.paymentId(), ACTIVE_STATUSES).stream()
                .filter(r -> r.getAmount().movePointRight(2).longValue() == update.amountPaise())
                .findFirst();
    }

    /** Admin confirms a refund was completed outside the automated path (e.g., via the Razorpay dashboard or bank transfer). */
    @Transactional
    public OrderRefund completeManualRefund(Long orderId, String reference, String actor) {
        OrderRefund refund = refundRepo.findFirstByOrderIdAndStatusOrderByIdDesc(orderId, OrderRefund.STATUS_MANUAL_REQUIRED)
                .orElseThrow(() -> new IllegalArgumentException("No refund is awaiting manual completion for this order."));
        Order order = orderRepo.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        LocalDateTime now = BusinessTime.now();
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        refund.setProviderRefundId(reference.trim());
        refund.setCompletedAt(now);
        refund.setResolvedBy(actor);
        refund.setNextAttemptAt(null);
        refund.setUpdatedAt(now);
        applyOrderRefundStatus(order, refund);
        return refund;
    }

    /**
     * Gives an escalated Razorpay refund one more automatic attempt. The attempt count is set just below the limit
     * (not reset), so the next claim still runs the refund-key reconciliation before any resend.
     */
    @Transactional
    public OrderRefund retryEscalatedRefund(Long orderId, String actor) {
        OrderRefund refund = refundRepo.findFirstByOrderIdAndStatusOrderByIdDesc(orderId, OrderRefund.STATUS_MANUAL_REQUIRED)
                .orElseThrow(() -> new IllegalArgumentException("No refund is awaiting manual action for this order."));
        if (!OrderRefund.METHOD_RAZORPAY.equals(refund.getMethod()) || refund.getPaymentId() == null) {
            throw new IllegalArgumentException("Only Razorpay refunds can be retried. Complete this refund manually instead.");
        }
        Order order = orderRepo.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        LocalDateTime now = BusinessTime.now();
        refund.setStatus(OrderRefund.STATUS_PENDING);
        refund.setAttempts(MAX_ATTEMPTS - 1);
        refund.setNextAttemptAt(now);
        refund.setFailureReason(null);
        refund.setUpdatedAt(now);
        applyOrderRefundStatus(order, refund);
        log.info("[Refund] Manual retry requested | refundId={} orderId={} actor={}", refund.getId(), orderId, actor);
        eventPublisher.publishEvent(new RefundRequestedEvent(refund.getId()));
        return refund;
    }

    private void applyOrderRefundStatus(Order order, OrderRefund refund) {
        switch (refund.getStatus()) {
            case OrderRefund.STATUS_SUCCEEDED -> {
                order.setRefundStatus(ORDER_REFUND_REFUNDED);
                order.setPaymentStatus("REFUNDED");
                order.setRefundReference(refund.getProviderRefundId());
            }
            case OrderRefund.STATUS_MANUAL_REQUIRED -> order.setRefundStatus(ORDER_REFUND_MANUAL_REQUIRED);
            default -> order.setRefundStatus(ORDER_REFUND_PENDING);
        }
    }

    private static Duration backoff(int attempts) {
        return Duration.ofMinutes(Math.min(60L, 1L << Math.min(Math.max(attempts, 1), 6)));
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 500 ? value : value.substring(0, 500);
    }
}
