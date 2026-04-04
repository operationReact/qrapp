package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateRazorpayOrderRequest;
import com.broandbro.qrapp.dto.CreateRazorpayOrderResponse;
import com.broandbro.qrapp.dto.VerifyPaymentRequest;
import com.broandbro.qrapp.dto.WalletBalanceResponse;
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

import java.util.Optional;
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
        return walletRepository.findByUser(user).orElseGet(() -> {
            Wallet wallet = Wallet.builder().user(user).balance(0L).build();
            return walletRepository.save(wallet);
        });
    }

    @Cacheable(value = "walletBalance", key = "#user.id", condition = "#user != null && #user.id != null")
    public WalletBalanceResponse getBalance(User user) {
        Wallet wallet = getOrCreateWallet(user);
        return new WalletBalanceResponse(wallet.getBalance());
    }

    public Page<WalletTransactionSummaryDto> getTransactions(User user, Pageable pageable) {
        if (user == null || user.getId() == null) {
            return Page.empty(pageable);
        }

        Wallet wallet = getOrCreateWallet(user);
        return txRepository.findSummariesByWalletId(wallet.getId(), pageable);
    }

    public CreateRazorpayOrderResponse createRazorpayOrder(User user, CreateRazorpayOrderRequest req) {
        String receipt = "wallet_" + user.getId() + "_" + UUID.randomUUID();
        String orderId = razorpayService.createOrder(req.getAmount(), "INR", receipt);

        Wallet wallet = getOrCreateWallet(user);
        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(req.getAmount())
                .type(TransactionType.CREDIT)
                .status(TransactionStatus.PENDING)
                .referenceId(orderId)
                .build();
        txRepository.save(transaction);
        return new CreateRazorpayOrderResponse(orderId);
    }

    @Transactional
    public void verifyPaymentAndCredit(User user, VerifyPaymentRequest req) {
        Optional<WalletTransaction> existing = txRepository.findByReferenceId(req.getRazorpayPaymentId());
        if (existing.isPresent() && existing.get().getStatus() == TransactionStatus.SUCCESS) {
            throw new DuplicateTransactionException("Payment already processed");
        }

        boolean valid = razorpayService.verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
        if (!valid) {
            txRepository.findByReferenceId(req.getRazorpayOrderId()).ifPresent(tx -> {
                tx.setStatus(TransactionStatus.FAILED);
                txRepository.save(tx);
            });
            throw new IllegalArgumentException("Invalid signature");
        }

        WalletTransaction pending = txRepository.findByReferenceId(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (pending.getStatus() == TransactionStatus.SUCCESS) {
            return;
        }

        Wallet wallet = pending.getWallet();
        wallet.setBalance(wallet.getBalance() + pending.getAmount());
        walletRepository.save(wallet);

        pending.setStatus(TransactionStatus.SUCCESS);
        pending.setReferenceId(req.getRazorpayPaymentId());
        txRepository.save(pending);
        evictWalletCache(user);
    }

    @Transactional
    public void payFromWallet(User user, WalletPayRequest req) {
        Wallet wallet = getOrCreateWallet(user);
        if (wallet.getBalance() < req.getAmount()) {
            throw new InsufficientBalanceException("Insufficient balance");
        }

        wallet.setBalance(wallet.getBalance() - req.getAmount());
        walletRepository.save(wallet);

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(req.getAmount())
                .type(TransactionType.DEBIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId("wallet_payment_" + UUID.randomUUID())
                .build();
        txRepository.save(transaction);
        evictWalletCache(user);
    }

    @CacheEvict(value = "walletBalance", key = "#user.id", condition = "#user != null && #user.id != null")
    public void evictWalletCache(User user) {
        if (user != null && user.getId() != null) {
            user.getId();
        }
    }
}
