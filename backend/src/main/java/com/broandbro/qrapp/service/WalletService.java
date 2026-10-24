package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateRazorpayOrderRequest;
import com.broandbro.qrapp.dto.CreateRazorpayOrderResponse;
import com.broandbro.qrapp.dto.VerifyPaymentRequest;
import com.broandbro.qrapp.dto.WalletBalanceResponse;
import com.broandbro.qrapp.dto.WalletOverviewResponse;
import com.broandbro.qrapp.dto.WalletTransactionSummaryDto;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.entity.WalletTransaction;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.exception.InsufficientBalanceException;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WalletTransactionRepository;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class WalletService {
    static final String WALLET_BALANCE_CACHE = "walletBalance";

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository txRepository;
    private final RazorpayService razorpayService;
    private final AppSettingService appSettingService;
    private final EntityManager entityManager;
    private final CacheManager cacheManager;
    private final TransactionTemplate walletCreationTx;
    private final TransactionTemplate failureRecordTx;

    public WalletService(WalletRepository walletRepository,
                         WalletTransactionRepository txRepository,
                         RazorpayService razorpayService,
                         AppSettingService appSettingService,
                         EntityManager entityManager,
                         CacheManager cacheManager,
                         PlatformTransactionManager transactionManager) {
        this.walletRepository = walletRepository;
        this.txRepository = txRepository;
        this.razorpayService = razorpayService;
        this.appSettingService = appSettingService;
        this.entityManager = entityManager;
        this.cacheManager = cacheManager;
        this.walletCreationTx = new TransactionTemplate(transactionManager);
        this.walletCreationTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
        this.failureRecordTx = new TransactionTemplate(transactionManager);
        this.failureRecordTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public Wallet getOrCreateWallet(User user) {
        User current = validateCurrentUser(user);
        ensureWalletRow(current);
        return walletRepository.findByUserId(current.getId())
                .orElseThrow(() -> new IllegalStateException("Wallet is unavailable"));
    }

    /**
     * Creates the wallet row if missing. The user row is locked first, so concurrent creators for the same
     * user serialise and the second one sees the committed wallet. Runs inside the caller's transaction when
     * one is active, so no second pooled connection is taken. The unique constraint stays as a backstop.
     */
    private void ensureWalletRow(User user) {
        if (walletRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }
        walletCreationTx.executeWithoutResult(status -> {
            entityManager.createNativeQuery("SELECT id FROM users WHERE id = :userId FOR UPDATE")
                    .setParameter("userId", user.getId())
                    .getSingleResult();
            if (walletRepository.findByUserId(user.getId()).isEmpty()) {
                walletRepository.save(Wallet.builder().user(user).balance(BigDecimal.ZERO.setScale(2)).build());
            }
        });
    }

    /**
     * Locks the user's wallet row (SELECT ... FOR UPDATE) and returns it with a fresh balance.
     * The lock is held until the enclosing transaction commits or rolls back. Callers must
     * acquire this before reading the balance used to authorise a debit.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Wallet lockWalletForUpdate(User user) {
        User current = validateCurrentUser(user);
        ensureWalletRow(current);
        Wallet wallet = walletRepository.findLockedByUserId(current.getId())
                .orElseThrow(() -> new IllegalStateException("Wallet is unavailable"));
        // The persistence context may already hold a pre-lock snapshot; refresh re-reads the committed balance under the lock.
        entityManager.refresh(wallet, LockModeType.PESSIMISTIC_WRITE);
        return wallet;
    }

    public WalletBalanceResponse getBalance(User user) {
        Wallet wallet = getOrCreateWallet(user);
        return new WalletBalanceResponse(wallet.getBalance());
    }

    @Transactional(readOnly = true)
    public WalletOverviewResponse getOverview(User user) {
        Wallet wallet = getOrCreateWallet(user);
        Long walletId = wallet.getId();
        BigDecimal totalCredited = txRepository.sumAmountByWalletIdAndTypeAndStatus(walletId, TransactionType.CREDIT, TransactionStatus.SUCCESS);
        BigDecimal totalDebited = txRepository.sumAmountByWalletIdAndTypeAndStatus(walletId, TransactionType.DEBIT, TransactionStatus.SUCCESS);
        BigDecimal pendingAmount = txRepository.sumAmountByWalletIdAndStatus(walletId, TransactionStatus.PENDING);
        long successfulCreditsCount = txRepository.countByWallet_IdAndTypeAndStatus(walletId, TransactionType.CREDIT, TransactionStatus.SUCCESS);
        long successfulDebitsCount = txRepository.countByWallet_IdAndTypeAndStatus(walletId, TransactionType.DEBIT, TransactionStatus.SUCCESS);

        return new WalletOverviewResponse(
                wallet.getBalance(),
                totalCredited,
                totalDebited,
                pendingAmount,
                successfulCreditsCount,
                successfulDebitsCount,
                txRepository.findLatestCreatedAtByWalletId(walletId)
        );
    }

    public Page<WalletTransactionSummaryDto> getTransactions(User user, Pageable pageable) {
        Wallet wallet = getOrCreateWallet(user);
        return txRepository.findSummariesByWalletId(wallet.getId(), pageable);
    }

    @Transactional
    public CreateRazorpayOrderResponse createRazorpayOrder(User user, CreateRazorpayOrderRequest req) {
        User currentUser = validateCurrentUser(user);
        BigDecimal amountRupees = BigDecimal.valueOf(validateAmount(req.getAmount())).setScale(2);
        BigDecimal minTopUp = appSettingService.getWalletMinTopUp();
        if (amountRupees.compareTo(minTopUp) < 0) {
            throw new IllegalArgumentException("Minimum top-up amount is ₹" + minTopUp.stripTrailingZeros().toPlainString());
        }
        String receipt = "wallet_" + currentUser.getId();
        // Razorpay API requires paise → multiply by 100 here only
        long amountPaise = amountRupees.movePointRight(2).longValueExact();
        String orderId = razorpayService.createOrder(amountPaise, "INR", receipt);

        Wallet wallet = getOrCreateWallet(currentUser);
        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(amountRupees)
                .type(TransactionType.CREDIT)
                .status(TransactionStatus.PENDING)
                .providerOrderId(orderId)
                .referenceId(orderId)
                .description("Wallet top-up initiated via Razorpay")
                .build();
        txRepository.save(transaction);
        return new CreateRazorpayOrderResponse(
                orderId,
                razorpayService.getKeyId(),
                amountPaise,
                "INR"
        );
    }

    @Transactional
    public void verifyPaymentAndCredit(User user, VerifyPaymentRequest req) {
        User currentUser = validateCurrentUser(user);
        // Lock before the duplicate check so concurrent verifications of the same payment serialise.
        Wallet wallet = lockWalletForUpdate(currentUser);
        txRepository.findByReferenceId(req.getRazorpayPaymentId())
                .filter(existing -> existing.getStatus() == TransactionStatus.SUCCESS)
                .ifPresent(existing -> {
                    throw new DuplicateTransactionException("Payment already processed");
                });

        boolean valid = razorpayService.verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
        WalletTransaction pending = txRepository.findByProviderOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!pending.getWallet().getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Wallet transaction does not belong to the current user");
        }

        if (pending.getStatus() == TransactionStatus.SUCCESS) {
            return;
        }

        if (!valid) {
            // The outer transaction rolls back on this exception, so the FAILED record is written
            // in its own transaction to survive. No balance change happens on this path.
            markTopUpFailedInNewTransaction(pending.getId());
            throw new IllegalArgumentException("Invalid signature");
        }

        wallet.setBalance(wallet.getBalance().add(pending.getAmount()));
        walletRepository.save(wallet);

        pending.setStatus(TransactionStatus.SUCCESS);
        pending.setReferenceId(req.getRazorpayPaymentId());
        pending.setDescription("Wallet top-up successful");
        pending.setBalanceAfter(wallet.getBalance());
        txRepository.save(pending);
        evictWalletBalanceCacheAfterCommit(currentUser.getId());
    }

    private void markTopUpFailedInNewTransaction(Long transactionId) {
        failureRecordTx.executeWithoutResult(status -> txRepository.findById(transactionId).ifPresent(tx -> {
            if (tx.getStatus() == TransactionStatus.PENDING) {
                tx.setStatus(TransactionStatus.FAILED);
                tx.setDescription("Wallet top-up failed verification");
                txRepository.save(tx);
            }
        }));
    }

    /** Debits the wallet for an order. The balance check runs under the row lock. */
    @Transactional
    public void payForOrder(User user, Long orderId, BigDecimal amount) {
        Wallet wallet = lockWalletForUpdate(user);
        executeWalletDebit(user, wallet, validateAmount(amount), orderId, "Order #" + orderId + " paid from wallet");
    }

    /** Credits back the amount paid from wallet for a cancelled order. Returns the refund reference. */
    @Transactional
    public String creditOrderRefund(User user, Long orderId, BigDecimal amount) {
        BigDecimal refundAmount = validateAmount(amount);
        Wallet wallet = lockWalletForUpdate(user);
        wallet.setBalance(wallet.getBalance().add(refundAmount));
        walletRepository.save(wallet);

        String referenceId = "wallet_refund_" + UUID.randomUUID();
        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(refundAmount)
                .type(TransactionType.CREDIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId(referenceId)
                .orderId(orderId)
                .description("Refund for cancelled order #" + orderId)
                .balanceAfter(wallet.getBalance())
                .build();
        txRepository.save(transaction);
        evictWalletBalanceCacheAfterCommit(user.getId());
        return referenceId;
    }

    /**
     * Evicts the cached balance only after the surrounding transaction commits.
     * Rollback leaves the cache untouched; with no active transaction it evicts immediately.
     */
    private void evictWalletBalanceCacheAfterCommit(Long userId) {
        if (userId == null) {
            return;
        }
        Runnable evict = () -> {
            Cache cache = cacheManager.getCache(WALLET_BALANCE_CACHE);
            if (cache != null) {
                cache.evict(userId);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evict.run();
                }
            });
        } else {
            evict.run();
        }
    }

    private void executeWalletDebit(User user, Wallet wallet, BigDecimal amount, Long orderId, String description) {
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("Insufficient balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(amount)
                .type(TransactionType.DEBIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId("wallet_payment_" + UUID.randomUUID())
                .orderId(orderId)
                .description(StringUtils.hasText(description) ? description.trim() : "Wallet payment")
                .balanceAfter(wallet.getBalance())
                .build();
        txRepository.save(transaction);
        evictWalletBalanceCacheAfterCommit(user.getId());
    }


    private User validateCurrentUser(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User authentication required");
        }
        return user;
    }

    private BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private long validateAmount(Long amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        return amount;
    }
}
