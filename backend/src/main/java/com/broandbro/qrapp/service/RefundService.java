package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderRefund;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.ops.SchedulerJobControl;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
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
    private final SchedulerRunRecorder runRecorder;
    private final SchedulerJobControl schedulerJobControl;

    public RefundService(OrderRefundRepository refundRepo,
                         OrderRepository orderRepo,
                         UserRepository userRepository,
                         RazorpayService razorpayService,
                         WalletService walletService,
                         ApplicationEventPublisher eventPublisher,
                         PlatformTransactionManager transactionManager,
                         SchedulerRunRecorder runRecorder,
                         SchedulerJobControl schedulerJobControl) {
        this.refundRepo = refundRepo;
        this.orderRepo = orderRepo;
        this.userRepository = userRepository;
        this.razorpayService = razorpayService;
        this.walletService = walletService;
        this.eventPublisher = eventPublisher;
        this.runRecorder = runRecorder;
        this.schedulerJobControl = schedulerJobControl;
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

    /**
     * Safety net: picks up refunds whose immediate attempt failed or whose process died mid-flight.
     * Only runs that find due refunds are recorded, so the 60-second poll does not fill the run history.
     */
    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void sweepDueRefunds() {
        if (schedulerJobControl.isPaused(SchedulerJobIds.REFUND_SWEEP)) {
            return;
        }
        LocalDateTime now = BusinessTime.now();
        List<OrderRefund> due = refundRepo.findTop50ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(ACTIVE_STATUSES, now);
        if (due.isEmpty()) {
            return;
        }
        runRecorder.runScheduled(SchedulerJobIds.REFUND_SWEEP,
                () -> due.forEach(refund -> processRefund(refund.getId())));
    }

    /** Attempts a refund once. Never throws; every outcome is recorded on the refund row. */
    public void processRefund(Long refundId) {
        Claim claimed;
        try {
            claimed = requiresNewTx.execute(status -> claim(refundId));
        } catch (RuntimeException e) {
            log.error("[Refund] Could not claim refund | refundId={}", refundId, e);
            return;
        }
        if (claimed != null) {
            attempt(claimed.refund(), claimed.previousStatus());
        }
    }

    /** A claimed refund and the status it had before the claim, which says whether an earlier request may have reached Razorpay. */
    private record Claim(OrderRefund refund, String previousStatus) {}

    private Claim claim(Long refundId) {
        LocalDateTime now = BusinessTime.now();
        String previousStatus = refundRepo.findByIdForUpdate(refundId).map(OrderRefund::getStatus).orElse(null);
        int claimedRows = refundRepo.claimForAttempt(refundId, now, now.plus(PROCESSING_LEASE), MAX_ATTEMPTS);
        if (claimedRows == 1) {
            return refundRepo.findById(refundId).map(refund -> new Claim(refund, previousStatus)).orElse(null);
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

    private void attempt(OrderRefund refund, String previousStatus) {
        Long id = refund.getId();
        try {
            Optional<RazorpayService.ProviderRefund> prior = reconcile(refund, previousStatus);
            if (prior.isPresent()) {
                RazorpayService.ProviderRefund existing = prior.get();
                log.info("[Refund] Reconciled existing provider refund | refundId={} providerRefundId={} providerStatus={}",
                        id, existing.id(), existing.status());
                if ("failed".equals(existing.status())) {
                    markVerifiedFailure(id, existing.id());
                } else {
                    markProviderAccepted(id, existing.id());
                }
                return;
            }
            long amountPaise = refund.getAmount().movePointRight(2).longValueExact();
            markProviderAccepted(id, razorpayService.refundPayment(refund.getPaymentId(), amountPaise, refund.getIdempotencyKey()));
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

    /**
     * Returns the provider refund already created for this key, if any. An empty result means a new request is
     * safe: no earlier request exists, or the earlier request was definitively rejected by Razorpay.
     * An ambiguous earlier request whose refund cannot be found is never resent; it stays under lease for another lookup.
     */
    private Optional<RazorpayService.ProviderRefund> reconcile(OrderRefund refund, String previousStatus) {
        if (OrderRefund.STATUS_PENDING.equals(previousStatus)) {
            return Optional.empty();
        }
        Optional<RazorpayService.ProviderRefund> prior =
                razorpayService.findRefundByKey(refund.getPaymentId(), refund.getIdempotencyKey());
        if (prior.isEmpty() && !OrderRefund.STATUS_FAILED.equals(previousStatus)) {
            throw new RazorpayService.RefundException(
                    "Earlier refund request outcome is unknown and no matching provider refund was found; not resending",
                    false, null);
        }
        return prior;
    }

    /**
     * Razorpay accepting the refund does not mean the bank has credited it (that can take up to 7 working days),
     * so the row stays open until the refund.processed webhook confirms it.
     */
    private void markProviderAccepted(Long refundId, String providerRefundId) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findByIdForUpdate(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                    || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
                return;
            }
            if (OrderRefund.STATUS_MANUAL_REQUIRED.equals(refund.getStatus())) {
                // Escalated while this request was in flight. Keep the status for staff but record the provider id.
                refund.setProviderRefundId(providerRefundId);
                refund.setUpdatedAt(BusinessTime.now());
                log.warn("[Refund] Accepted by Razorpay after escalation; staff must reconcile | refundId={} providerRefundId={}",
                        refundId, providerRefundId);
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
            OrderRefund refund = refundRepo.findByIdForUpdate(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                    || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
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

    /**
     * Razorpay reports the refund for this key as failed, so no money moved. The documented contract does not
     * define a same-key replay after failure, and a new key would be a new operation, so the row goes to staff
     * instead of cycling through backoff. The failed id is kept in the reason only, so a replacement refund
     * created on the dashboard can still be recorded against this row.
     */
    private void markVerifiedFailure(Long refundId, String failedProviderRefundId) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findByIdForUpdate(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                    || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
                return;
            }
            LocalDateTime now = BusinessTime.now();
            refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
            refund.setFailureReason(truncate("Razorpay reports refund " + failedProviderRefundId
                    + " as failed; verify on the Razorpay dashboard before recovering"));
            refund.setNextAttemptAt(null);
            refund.setUpdatedAt(now);
            orderRepo.findByIdForUpdate(refund.getOrderId())
                    .ifPresent(order -> applyOrderRefundStatus(order, refund));
            log.warn("[Refund] Verified failed by Razorpay; escalated to manual review | refundId={} failedProviderRefundId={}",
                    refundId, failedProviderRefundId);
        });
    }

    private void markAmbiguous(Long refundId, String reason) {
        tx.executeWithoutResult(status -> {
            OrderRefund refund = refundRepo.findByIdForUpdate(refundId).orElseThrow();
            if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                    || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
                return;
            }
            // Status stays PROCESSING and nextAttemptAt keeps the lease, so the sweeper retries only after the lease expires.
            refund.setStatus(OrderRefund.STATUS_PROCESSING);
            refund.setFailureReason(truncate(reason));
            refund.setUpdatedAt(BusinessTime.now());
        });
    }

    /**
     * Refund details extracted from a Razorpay refund webhook. {@code amountPaise} is the refund amount and
     * {@code paymentAmountPaise} the original payment amount; either may be null when absent.
     */
    public record ProviderRefundUpdate(String event, String providerRefundId, String refundKey,
                                       String paymentId, Long amountPaise,
                                       String speedRequested, String speedProcessed, String acquirerArn,
                                       String paymentMethod, String paymentVpa, String paymentBank,
                                       String paymentCardLast4, Long paymentAmountPaise) {
        public ProviderRefundUpdate(String event, String providerRefundId, String refundKey,
                                    String paymentId, Long amountPaise) {
            this(event, providerRefundId, refundKey, paymentId, amountPaise, null, null, null, null, null, null, null, null);
        }

        public ProviderRefundUpdate(String event, String providerRefundId, String refundKey,
                                    String paymentId, Long amountPaise,
                                    String speedRequested, String speedProcessed, String acquirerArn) {
            this(event, providerRefundId, refundKey, paymentId, amountPaise, speedRequested, speedProcessed, acquirerArn,
                    null, null, null, null, null);
        }
    }

    /**
     * Applies a Razorpay refund webhook to our refund record. Returns false when the refund was not issued by us.
     * The order row is locked, matching cancellation and admin writes, so the two never interleave.
     */
    @Transactional
    public boolean applyProviderRefundEvent(ProviderRefundUpdate update) {
        Optional<Long> match = findRefundIdForEvent(update);
        if (match.isEmpty()) {
            log.info("[Refund] Webhook refund not linked to an order | event={} providerRefundId={} paymentId={}",
                    update.event(), update.providerRefundId(), update.paymentId());
            return false;
        }
        // Lock order: refund row, then order row. Every refund writer uses this order.
        // The row is first loaded by its locking query here; an entity loaded unlocked earlier in this transaction would keep stale fields.
        OrderRefund refund = refundRepo.findByIdForUpdate(match.get()).orElseThrow();
        Order order = orderRepo.findByIdForUpdate(refund.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Order not found for refund " + refund.getId()));
        LocalDateTime now = BusinessTime.now();

        switch (update.event()) {
            case "refund.processed" -> {
                applyProviderDetails(refund, order, update, now);
                markProcessedFromProvider(refund, order, update.providerRefundId(), now);
            }
            case "refund.failed" -> {
                applyProviderDetails(refund, order, update, now);
                markFailedFromProvider(refund, order, now);
            }
            case "refund.created" -> {
                if (refund.getProviderRefundId() == null && update.providerRefundId() != null) {
                    refund.setProviderRefundId(update.providerRefundId());
                }
                applyProviderDetails(refund, order, update, now);
            }
            case "refund.speed_changed" -> applyProviderDetails(refund, order, update, now);
            default -> log.info("[Refund] Webhook event acknowledged without state change | event={} refundId={}",
                    update.event(), refund.getId());
        }
        refund.setUpdatedAt(now);
        return true;
    }

    /**
     * Speed and ARN are recorded when present. An ARN is the bank-credit confirmation, so it promotes a
     * PROCESSED_BY_GATEWAY refund to SUCCEEDED. Speed alone never changes the status.
     */
    private void applyProviderDetails(OrderRefund refund, Order order, ProviderRefundUpdate update, LocalDateTime now) {
        if (update.speedRequested() != null) {
            refund.setSpeedRequested(update.speedRequested());
        }
        if (update.speedProcessed() != null) {
            refund.setSpeedProcessed(update.speedProcessed());
        }
        if (update.acquirerArn() != null) {
            refund.setAcquirerArn(update.acquirerArn());
            if (OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
                refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
                refund.setCompletedAt(now);
                applyOrderRefundStatus(order, refund);
                log.info("[Refund] Bank credit confirmed by ARN | refundId={} orderId={}", refund.getId(), refund.getOrderId());
            }
        }
        if (update.paymentMethod() != null) {
            refund.setPaymentMethod(update.paymentMethod());
        }
        if (update.paymentVpa() != null) {
            refund.setPaymentVpa(update.paymentVpa());
        }
        if (update.paymentBank() != null) {
            refund.setPaymentBank(update.paymentBank());
        }
        if (update.paymentCardLast4() != null) {
            refund.setPaymentCardLast4(update.paymentCardLast4());
        }
        if (update.paymentAmountPaise() != null) {
            refund.setPaymentAmount(BigDecimal.valueOf(update.paymentAmountPaise(), 2));
        }
    }

    /**
     * Razorpay "processed" is final on their side, but the bank may still take days to credit. Without an ARN the
     * refund is PROCESSED_BY_GATEWAY; with one it is SUCCEEDED.
     */
    private void markProcessedFromProvider(OrderRefund refund, Order order, String providerRefundId, LocalDateTime now) {
        if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())) {
            // Keep the first recorded reference (for example, one entered by an admin on manual completion).
            if (refund.getProviderRefundId() == null) {
                refund.setProviderRefundId(providerRefundId);
            }
            return;
        }
        if (refund.getProviderRefundId() != null && providerRefundId != null
                && !refund.getProviderRefundId().equals(providerRefundId)) {
            // A second provider refund for one BroBro key: keep the recorded id and never let the event overwrite it.
            refund.setStatus(OrderRefund.STATUS_MANUAL_REQUIRED);
            refund.setFailureReason(truncate("Razorpay reported refund " + providerRefundId
                    + " but this refund recorded " + refund.getProviderRefundId() + "; verify on the Razorpay dashboard"));
            refund.setNextAttemptAt(null);
            applyOrderRefundStatus(order, refund);
            log.error("[Refund] Processed event names a different provider refund; escalated | refundId={} recorded={} reported={}",
                    refund.getId(), refund.getProviderRefundId(), providerRefundId);
            return;
        }
        boolean credited = refund.getAcquirerArn() != null;
        refund.setStatus(credited ? OrderRefund.STATUS_SUCCEEDED : OrderRefund.STATUS_PROCESSED_BY_GATEWAY);
        refund.setProviderRefundId(providerRefundId != null ? providerRefundId : refund.getProviderRefundId());
        refund.setCompletedAt(now);
        refund.setNextAttemptAt(null);
        refund.setFailureReason(null);
        applyOrderRefundStatus(order, refund);
        log.info("[Refund] Processed by Razorpay | refundId={} orderId={} providerRefundId={} bankCredited={}",
                refund.getId(), refund.getOrderId(), providerRefundId, credited);
    }

    private void markFailedFromProvider(OrderRefund refund, Order order, LocalDateTime now) {
        if (OrderRefund.STATUS_SUCCEEDED.equals(refund.getStatus())
                || OrderRefund.STATUS_PROCESSED_BY_GATEWAY.equals(refund.getStatus())
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

    private Optional<Long> findRefundIdForEvent(ProviderRefundUpdate update) {
        if (update.refundKey() != null && !update.refundKey().isBlank()) {
            return refundRepo.findIdsByIdempotencyKey(update.refundKey()).stream().findFirst();
        }
        // Dashboard-created refunds carry no BroBro key and are never linked by amount: only the provider
        // refund id we recorded ties an event to a row.
        if (update.providerRefundId() != null) {
            return refundRepo.findIdsByProviderRefundId(update.providerRefundId()).stream().findFirst();
        }
        return Optional.empty();
    }

    /**
     * Admin confirms a refund was completed outside the automated path. Razorpay refunds must be verified against
     * Razorpay before the row is marked SUCCEEDED: the reference must be the refund id, Razorpay must report it as
     * processed, and it must match this refund's payment, amount and refund key. Other methods (wallet, manual) keep
     * the reference as an audit note. A reference already linked to another refund row is always rejected.
     */
    @Transactional
    public OrderRefund completeManualRefund(Long orderId, String reference, String actor) {
        return completeManualRefund(orderId, reference, actor, false);
    }

    /**
     * Completes an escalated refund after verifying the Razorpay refund id. A refund with no BroBro key was created on
     * the Razorpay dashboard; it is accepted only when the operator acknowledges that explicitly and Razorpay shows no
     * live refund under this row's key. A failed provider refund under the key does not block recovery.
     */
    @Transactional
    public OrderRefund completeManualRefund(Long orderId, String reference, String actor, boolean acknowledgeDashboardRefund) {
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("A reference is required to complete a refund manually.");
        }
        String trimmedReference = reference.trim();
        OrderRefund refund = lockManualRefund(orderId, "No refund is awaiting manual completion for this order.");
        Order order = orderRepo.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        boolean dashboardRefund = false;
        if (OrderRefund.METHOD_RAZORPAY.equals(refund.getMethod())) {
            dashboardRefund = verifyRazorpayRefund(refund, trimmedReference, acknowledgeDashboardRefund);
        }
        refundRepo.findFirstByProviderRefundId(trimmedReference)
                .filter(other -> !other.getId().equals(refund.getId()))
                .ifPresent(other -> {
                    throw new IllegalArgumentException("This reference is already linked to another refund.");
                });
        if (dashboardRefund) {
            log.warn("[Refund] Completed with a dashboard-created Razorpay refund (no BroBro key) | refundId={} providerRefundId={} actor={}",
                    refund.getId(), trimmedReference, actor);
        }
        LocalDateTime now = BusinessTime.now();
        refund.setStatus(OrderRefund.STATUS_SUCCEEDED);
        refund.setProviderRefundId(trimmedReference);
        refund.setCompletedAt(now);
        refund.setResolvedBy(actor);
        refund.setNextAttemptAt(null);
        refund.setUpdatedAt(now);
        applyOrderRefundStatus(order, refund);
        return refund;
    }

    /**
     * Confirms with Razorpay that the refund id belongs to this refund. A fetch failure throws, so the transaction
     * rolls back and the row stays MANUAL_REQUIRED for another attempt. Returns true when the refund has no BroBro key.
     */
    private boolean verifyRazorpayRefund(OrderRefund refund, String refundId, boolean acknowledgeDashboardRefund) {
        if (refund.getPaymentId() == null || refund.getIdempotencyKey() == null) {
            throw new IllegalArgumentException("This refund lacks the provider identifiers needed for verification.");
        }
        if (refund.getProviderRefundId() != null && !refund.getProviderRefundId().equals(refundId)) {
            throw new IllegalArgumentException("The reference does not match the Razorpay refund already recorded for this order.");
        }
        if (!refundId.startsWith("rfnd_")) {
            throw new IllegalArgumentException("Enter the Razorpay refund id (rfnd_...) from the dashboard.");
        }
        RazorpayService.RefundDetail detail;
        try {
            detail = razorpayService.fetchRefund(refund.getPaymentId(), refundId);
        } catch (RazorpayService.RefundException e) {
            throw new IllegalStateException("Could not verify the refund with Razorpay; nothing was changed. Try again later.", e);
        }
        if (!"processed".equals(detail.status())) {
            throw new IllegalArgumentException("Razorpay reports this refund as " + detail.status()
                    + "; only processed refunds can be completed.");
        }
        if (!refund.getPaymentId().equals(detail.paymentId())
                || detail.amountPaise() != refund.getAmount().movePointRight(2).longValueExact()) {
            throw new IllegalArgumentException("The Razorpay refund does not match this order's payment and amount.");
        }
        if (detail.refundKey() == null) {
            if (!acknowledgeDashboardRefund) {
                throw new IllegalArgumentException("This Razorpay refund has no BroBro refund key, so it was created on the "
                        + "dashboard. Confirm it explicitly to complete the refund manually.");
            }
            ensureNoLiveProviderRefund(refund);
            return true;
        }
        if (!refund.getIdempotencyKey().equals(detail.refundKey())) {
            throw new IllegalArgumentException("The Razorpay refund is not linked to this order's refund key.");
        }
        return false;
    }

    /**
     * Confirms BroBro's own request for this row did not create a live refund at Razorpay. A failed one moved no money.
     * A lookup error throws, so nothing is recorded when the answer is unknown.
     */
    private void ensureNoLiveProviderRefund(OrderRefund refund) {
        Optional<RazorpayService.ProviderRefund> ours;
        try {
            ours = razorpayService.findRefundByKey(refund.getPaymentId(), refund.getIdempotencyKey());
        } catch (RuntimeException e) {
            throw new IllegalStateException("Could not confirm that BroBro's refund request did not reach Razorpay; nothing was changed. Try again later.", e);
        }
        if (ours.filter(p -> !"failed".equals(p.status())).isPresent()) {
            throw new IllegalArgumentException("Razorpay has a live refund (" + ours.get().id()
                    + ") under this order's refund key; reconcile it instead of completing a dashboard refund.");
        }
    }

    /** Locks the escalated refund row first (the same order as the webhook and attempt paths) and re-checks its status. */
    private OrderRefund lockManualRefund(Long orderId, String notFoundMessage) {
        OrderRefund candidate = refundRepo.findFirstByOrderIdAndStatusOrderByIdDesc(orderId, OrderRefund.STATUS_MANUAL_REQUIRED)
                .orElseThrow(() -> new IllegalArgumentException(notFoundMessage));
        return refundRepo.findByIdForUpdate(candidate.getId())
                .filter(r -> OrderRefund.STATUS_MANUAL_REQUIRED.equals(r.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException(notFoundMessage));
    }

    /**
     * Re-runs refund-key reconciliation for an escalated Razorpay refund. The row returns to PROCESSING rather than
     * PENDING, so the next claim looks up the earlier request before any send. A refund that Razorpay does not report
     * is never resent here; staff resolve it with completeManualRefund after checking the Razorpay dashboard.
     */
    @Transactional
    public OrderRefund retryEscalatedRefund(Long orderId, String actor) {
        OrderRefund refund = lockManualRefund(orderId, "No refund is awaiting manual action for this order.");
        if (!OrderRefund.METHOD_RAZORPAY.equals(refund.getMethod()) || refund.getPaymentId() == null) {
            throw new IllegalArgumentException("Only Razorpay refunds can be retried. Complete this refund manually instead.");
        }
        Order order = orderRepo.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        LocalDateTime now = BusinessTime.now();
        refund.setStatus(OrderRefund.STATUS_PROCESSING);
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
            case OrderRefund.STATUS_SUCCEEDED, OrderRefund.STATUS_PROCESSED_BY_GATEWAY -> {
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
