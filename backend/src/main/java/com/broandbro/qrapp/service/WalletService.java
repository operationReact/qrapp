package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateRazorpayOrderRequest;
import com.broandbro.qrapp.dto.CreateRazorpayOrderResponse;
import com.broandbro.qrapp.dto.VerifyPaymentRequest;
import com.broandbro.qrapp.dto.WalletBalanceResponse;
import com.broandbro.qrapp.dto.WalletPayRequest;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.entity.WalletTransaction;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.exception.InsufficientBalanceException;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WalletTransactionRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.time.Instant;
import java.time.Duration;

@Service
public class WalletService {
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository txRepository;
    private final RazorpayService razorpayService;

    // Simple local cache to reliably prevent hotspots causing repeated DB reads.
    private static class CachedBalance {
        final WalletBalanceResponse value;
        final Instant ts;
        CachedBalance(WalletBalanceResponse v) { this.value = v; this.ts = Instant.now(); }
    }
    private final ConcurrentMap<Long, CachedBalance> localCache = new ConcurrentHashMap<>();
    private static final Duration LOCAL_CACHE_TTL = Duration.ofSeconds(30);
    // transactions cache
    private static class CachedTxs { final java.util.List<WalletTransaction> value; final Instant ts; CachedTxs(java.util.List<WalletTransaction> v){ this.value=v; this.ts=Instant.now(); }}
    private final ConcurrentMap<Long, CachedTxs> localTxCache = new ConcurrentHashMap<>();
    private static final Duration LOCAL_TX_CACHE_TTL = Duration.ofSeconds(30);
    // in-flight coalescing maps (ensure single DB fetch for concurrent requests)
    private final ConcurrentMap<Long, CompletableFuture<WalletBalanceResponse>> pendingBalanceRequests = new ConcurrentHashMap<>();
    private final ConcurrentMap<Long, CompletableFuture<java.util.List<WalletTransaction>>> pendingTxRequests = new ConcurrentHashMap<>();
    // simple per-user rate limiter
    private static class AccessInfo { Instant windowStart; int count; AccessInfo(){ this.windowStart = Instant.now(); this.count = 0; } }
    private final ConcurrentMap<Long, AccessInfo> balanceAccess = new ConcurrentHashMap<>();
    private final ConcurrentMap<Long, AccessInfo> txAccess = new ConcurrentHashMap<>();
    private static final Duration RATE_WINDOW = Duration.ofSeconds(5);
    private static final int RATE_MAX = 8; // allow up to 8 requests per window; beyond that use cached reply

    public WalletService(WalletRepository walletRepository, WalletTransactionRepository txRepository, RazorpayService razorpayService) {
        this.walletRepository = walletRepository;
        this.txRepository = txRepository;
        this.razorpayService = razorpayService;
    }

    public Wallet getOrCreateWallet(User user) {
        System.out.println("[WalletService] getOrCreateWallet called for userId=" + (user == null ? "null" : user.getId()));
        return walletRepository.findByUser(user).orElseGet(() -> {
            Wallet w = Wallet.builder().user(user).balance(0L).build();
            return walletRepository.save(w);
        });
    }

    @Cacheable(value = "walletBalance", key = "#user.id")
    public WalletBalanceResponse getBalance(User user) {
        // First consult local in-memory cache to avoid repeated DB reads under high request volume.
        if (user != null) {
            // enforce light rate limiting: if too many requests in window and we have cache, return cached
            AccessInfo ai = balanceAccess.computeIfAbsent(user.getId(), k -> new AccessInfo());
            synchronized (ai) {
                Instant now = Instant.now();
                if (Duration.between(ai.windowStart, now).compareTo(RATE_WINDOW) > 0) {
                    ai.windowStart = now; ai.count = 1;
                } else {
                    ai.count += 1;
                }
                if (ai.count > RATE_MAX) {
                    CachedBalance cb2 = localCache.get(user.getId());
                    if (cb2 != null) {
                        System.out.println("[WalletService] getBalance: rate limit hit, returning cached for userId=" + user.getId());
                        return cb2.value;
                    }
                }
            }
        }
        if (user != null) {
            CachedBalance cb = localCache.get(user.getId());
            if (cb != null) {
                if (Duration.between(cb.ts, Instant.now()).compareTo(LOCAL_CACHE_TTL) < 0) {
                    System.out.println("[WalletService] getBalance: local cache HIT for userId=" + user.getId());
                    return cb.value;
                } else {
                    System.out.println("[WalletService] getBalance: local cache EXPIRED for userId=" + user.getId());
                    localCache.remove(user.getId(), cb);
                }
            } else {
                System.out.println("[WalletService] getBalance: local cache MISS for userId=" + user.getId());
            }
        } else {
            System.out.println("[WalletService] getBalance: user is null (anonymous)");
        }
        // Use in-flight coalescing: if another thread is already fetching, wait for it instead of hitting DB again
        if (user != null) {
            Long uid = user.getId();
            CompletableFuture<WalletBalanceResponse> f = pendingBalanceRequests.computeIfAbsent(uid, k ->
                CompletableFuture.supplyAsync(() -> {
                    // actual DB fetch
                    Wallet w2 = getOrCreateWallet(user);
                    System.out.println("[WalletService] getBalance: fetched wallet from repo for userId=" + uid);
                    WalletBalanceResponse r2 = new WalletBalanceResponse(w2.getBalance());
                    // populate local cache
                    localCache.put(uid, new CachedBalance(r2));
                    return r2;
                })
            );
            try {
                return f.get();
            } catch (Exception e) {
                throw new RuntimeException(e);
            } finally {
                pendingBalanceRequests.remove(uid, f);
            }
        }
        // anonymous / no-user case: just fetch directly
        Wallet w = getOrCreateWallet(user);
        System.out.println("[WalletService] getBalance: fetched wallet from repo for userId=" + (user == null ? "null" : user.getId()));
        return new WalletBalanceResponse(w.getBalance());
    }

    public List<WalletTransaction> getTransactions(User user) {
        if (user == null) return java.util.Collections.emptyList();
        // rate limit defense for txs
        AccessInfo tai = txAccess.computeIfAbsent(user.getId(), k -> new AccessInfo());
        synchronized (tai) {
            Instant now = Instant.now();
            if (Duration.between(tai.windowStart, now).compareTo(RATE_WINDOW) > 0) { tai.windowStart = now; tai.count = 1; } else { tai.count += 1; }
            if (tai.count > RATE_MAX) {
                CachedTxs c2 = localTxCache.get(user.getId());
                if (c2 != null) {
                    System.out.println("[WalletService] getTransactions: rate limit hit, returning cached for userId=" + user.getId());
                    return c2.value;
                }
            }
        }
        Long uid = user.getId();
        // consult local transactions cache
        CachedTxs c = localTxCache.get(uid);
        if (c != null && Duration.between(c.ts, Instant.now()).compareTo(LOCAL_TX_CACHE_TTL) < 0) {
            System.out.println("[WalletService] getTransactions: local tx cache HIT for userId=" + uid);
            return c.value;
        }
        // coalesce in-flight requests
        CompletableFuture<java.util.List<WalletTransaction>> f = pendingTxRequests.computeIfAbsent(uid, k ->
            CompletableFuture.supplyAsync(() -> {
                Wallet w = getOrCreateWallet(user);
                System.out.println("[WalletService] getTransactions: fetched transactions from repo for userId=" + uid);
                java.util.List<WalletTransaction> txs = txRepository.findAllByWallet_Id(w.getId());
                // populate local cache
                localTxCache.put(uid, new CachedTxs(txs));
                return txs;
            })
        );
        try {
            return f.get();
        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {
            pendingTxRequests.remove(uid, f);
        }
    }

    public CreateRazorpayOrderResponse createRazorpayOrder(User user, CreateRazorpayOrderRequest req) {
        // amount already in paise
        String receipt = "wallet_" + user.getId() + "_" + UUID.randomUUID();
        String orderId = razorpayService.createOrder(req.getAmount(), "INR", receipt);
        // save a PENDING transaction to ensure idempotency and tracking
        Wallet w = getOrCreateWallet(user);
        WalletTransaction tx = WalletTransaction.builder()
                .wallet(w)
                .amount(req.getAmount())
                .type(TransactionType.CREDIT)
                .status(TransactionStatus.PENDING)
                .referenceId(orderId)
                .build();
        txRepository.save(tx);
        return new CreateRazorpayOrderResponse(orderId);
    }

    @Transactional
    public void verifyPaymentAndCredit(User user, VerifyPaymentRequest req) {
        // idempotency: if transaction already SUCCESS for this payment id, ignore
        Optional<WalletTransaction> existing = txRepository.findByReferenceId(req.getRazorpayPaymentId());
        if (existing.isPresent() && existing.get().getStatus() == TransactionStatus.SUCCESS) {
            throw new DuplicateTransactionException("Payment already processed");
        }

        boolean valid = razorpayService.verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
        if (!valid) {
            // mark as failed if pending exists for order id
            txRepository.findByReferenceId(req.getRazorpayOrderId()).ifPresent(tx -> { tx.setStatus(TransactionStatus.FAILED); txRepository.save(tx); });
            throw new IllegalArgumentException("Invalid signature");
        }

        // find pending transaction by order id
        WalletTransaction pending = txRepository.findByReferenceId(req.getRazorpayOrderId()).orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (pending.getStatus() == TransactionStatus.SUCCESS) return; // already processed (extra guard)

        // credit wallet
        Wallet w = pending.getWallet();
        long newBalance = w.getBalance() + pending.getAmount();
        w.setBalance(newBalance);
        walletRepository.save(w);

        // create transaction record for payment id and mark success
        pending.setStatus(TransactionStatus.SUCCESS);
        pending.setReferenceId(req.getRazorpayPaymentId());
        txRepository.save(pending);
        // evict cache for this user's wallet balance
        evictWalletCache(user);
        if (user != null) localCache.remove(user.getId());
        if (user != null) localTxCache.remove(user.getId());
    }

    @Transactional
    public void payFromWallet(User user, WalletPayRequest req) {
        Wallet w = getOrCreateWallet(user);
        if (w.getBalance() < req.getAmount()) throw new InsufficientBalanceException("Insufficient balance");

        // debit
        w.setBalance(w.getBalance() - req.getAmount());
        walletRepository.save(w);

        WalletTransaction tx = WalletTransaction.builder()
                .wallet(w)
                .amount(req.getAmount())
                .type(TransactionType.DEBIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId("wallet_payment_" + UUID.randomUUID())
                .build();
        txRepository.save(tx);
        // evict cache for this user's wallet balance
        evictWalletCache(user);
        if (user != null) localCache.remove(user.getId());
        if (user != null) localTxCache.remove(user.getId());
    }

    // use programmatic cache eviction method so we can call it from non-proxied contexts
    @CacheEvict(value = "walletBalance", key = "#user.id")
    public void evictWalletCache(User user) { if (user != null) { System.out.println("evicted walletBalance cache for user id="+user.getId()); } }
}
