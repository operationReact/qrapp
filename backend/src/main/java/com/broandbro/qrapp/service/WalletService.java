package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateRazorpayOrderRequest;
import com.broandbro.qrapp.dto.CreateRazorpayOrderResponse;
import com.broandbro.qrapp.dto.VerifyPaymentRequest;
import com.broandbro.qrapp.dto.WalletBalanceResponse;
import com.broandbro.qrapp.dto.WalletOverviewResponse;
import com.broandbro.qrapp.dto.WalletPayRequest;
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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class WalletService {
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository txRepository;
    private final RazorpayService razorpayService;

    public WalletService(WalletRepository walletRepository, WalletTransactionRepository txRepository, RazorpayService razorpayService) {
        this.walletRepository = walletRepository;
        this.txRepository = txRepository;
        this.razorpayService = razorpayService;
    }

    public Wallet getOrCreateWallet(User user) {
        User currentUser = validateCurrentUser(user);
        return walletRepository.findByUserId(currentUser.getId()).orElseGet(() -> {
            Wallet wallet = Wallet.builder().user(user).balance(0L).build();
            return walletRepository.save(wallet);
        });
    }

    @Cacheable(value = "walletBalance", key = "#user.id", condition = "#user != null && #user.id != null")
    public WalletBalanceResponse getBalance(User user) {
        Wallet wallet = getOrCreateWallet(user);
        return new WalletBalanceResponse(wallet.getBalance());
    }

    @Transactional(readOnly = true)
    public WalletOverviewResponse getOverview(User user) {
        Wallet wallet = getOrCreateWallet(user);
        Long walletId = wallet.getId();
        Long totalCredited = txRepository.sumAmountByWalletIdAndTypeAndStatus(walletId, TransactionType.CREDIT, TransactionStatus.SUCCESS);
        Long totalDebited = txRepository.sumAmountByWalletIdAndTypeAndStatus(walletId, TransactionType.DEBIT, TransactionStatus.SUCCESS);
        Long pendingAmount = txRepository.sumAmountByWalletIdAndStatus(walletId, TransactionStatus.PENDING);
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
        long amount = validateAmount(req.getAmount());
        String receipt = "wallet_" + currentUser.getId() + "_" + UUID.randomUUID();
        String orderId = razorpayService.createOrder(amount, "INR", receipt);

        Wallet wallet = getOrCreateWallet(currentUser);
        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(amount)
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
                amount,
                "INR"
        );
    }

    @Transactional
    public void verifyPaymentAndCredit(User user, VerifyPaymentRequest req) {
        User currentUser = validateCurrentUser(user);
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
            pending.setStatus(TransactionStatus.FAILED);
            pending.setDescription("Wallet top-up failed verification");
            txRepository.save(pending);
            throw new IllegalArgumentException("Invalid signature");
        }

        Wallet wallet = pending.getWallet();
        wallet.setBalance(wallet.getBalance() + pending.getAmount());
        walletRepository.save(wallet);

        pending.setStatus(TransactionStatus.SUCCESS);
        pending.setReferenceId(req.getRazorpayPaymentId());
        pending.setDescription("Wallet top-up successful");
        pending.setBalanceAfter(wallet.getBalance());
        txRepository.save(pending);
        evictWalletCache(currentUser);
    }

    @Transactional(readOnly = true)
    public void ensureSufficientBalance(User user, long amount) {
        Wallet wallet = getOrCreateWallet(user);
        if (wallet.getBalance() < amount) {
            throw new InsufficientBalanceException("Insufficient balance");
        }
    }

    @Transactional
    public void payFromWallet(User user, WalletPayRequest req) {
        Wallet wallet = getOrCreateWallet(user);
        executeWalletDebit(user, wallet, validateAmount(req.getAmount()), req.getOrderId(), req.getDescription());
    }

    @Transactional
    public void payForOrder(User user, Long orderId, long amount) {
        Wallet wallet = getOrCreateWallet(user);
        executeWalletDebit(user, wallet, validateAmount(amount), orderId, "Order #" + orderId + " paid from wallet");
    }

    @CacheEvict(value = "walletBalance", key = "#user.id", condition = "#user != null && #user.id != null")
    public void evictWalletCache(User user) {
        // Annotation-driven cache eviction only.
    }

    private void executeWalletDebit(User user, Wallet wallet, long amount, Long orderId, String description) {
        if (wallet.getBalance() < amount) {
            throw new InsufficientBalanceException("Insufficient balance");
        }

        wallet.setBalance(wallet.getBalance() - amount);
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
        evictWalletCache(user);
    }

    private User validateCurrentUser(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User authentication required");
        }
        return user;
    }

    private long validateAmount(Long amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        return amount;
    }
}
