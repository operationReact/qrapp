package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.exception.InsufficientBalanceException;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WalletTransactionRepository;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;

/**
 * Wallet checkout-safety scenarioS. Each subclass runs them against a concrete database:
 * H2 (default test run) and PostgreSQL (gated by QRAPP_IT_PG_URL). Data is committed
 * (no test-level transaction) so that real commit, rollback and locking semantics apply.
 */
abstract class WalletCheckoutSafetyTestBase {

    @Autowired protected WalletService walletService;
    @Autowired protected WalletOrderPaymentService walletOrderPaymentService;
    @Autowired protected WalletRepository walletRepository;
    @Autowired protected WalletTransactionRepository txRepository;
    @Autowired protected OrderRepository orderRepository;
    @Autowired protected UserRepository userRepository;
    @Autowired protected CacheManager cacheManager;
    @Autowired protected PlatformTransactionManager transactionManager;
    @Autowired protected JdbcTemplate jdbcTemplate;

    @MockitoSpyBean
    protected OrderService orderService;

    private final List<Long> userIds = new ArrayList<>();
    private final List<Long> orderIds = new ArrayList<>();
    protected final List<Long> locationIds = new ArrayList<>();
    protected final List<Long> menuItemIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        if (!userIds.isEmpty()) {
            String inClause = placeholders(userIds);
            orderIds.addAll(jdbcTemplate.queryForList(
                    "SELECT id FROM orders WHERE user_id IN (" + inClause + ")", Long.class, userIds.toArray()));
        }
        if (!orderIds.isEmpty()) {
            String orderIn = placeholders(orderIds);
            Object[] ids = orderIds.toArray();
            jdbcTemplate.update("DELETE FROM wallet_transactions WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM razorpay_webhook_events WHERE razorpay_order_id IN (SELECT razorpay_order_id FROM orders WHERE id IN (" + orderIn + "))", ids);
            jdbcTemplate.update("DELETE FROM payment_events WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM order_status_history WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM order_refunds WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM promotion_usage WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM invoice WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM order_support_requests WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM order_item WHERE order_id IN (" + orderIn + ")", ids);
            jdbcTemplate.update("DELETE FROM orders WHERE id IN (" + orderIn + ")", ids);
        }
        if (!userIds.isEmpty()) {
            String inClause = placeholders(userIds);
            jdbcTemplate.update("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (" + inClause + "))", userIds.toArray());
            jdbcTemplate.update("DELETE FROM wallets WHERE user_id IN (" + inClause + ")", userIds.toArray());
            jdbcTemplate.update("DELETE FROM users WHERE id IN (" + inClause + ")", userIds.toArray());
        }
        if (!menuItemIds.isEmpty()) {
            String menuIn = placeholders(menuItemIds);
            jdbcTemplate.update("DELETE FROM menu_item_selling_price_history WHERE menu_item_id IN (" + menuIn + ")", menuItemIds.toArray());
            jdbcTemplate.update("DELETE FROM menu_item WHERE id IN (" + menuIn + ")", menuItemIds.toArray());
        }
        if (!locationIds.isEmpty()) {
            jdbcTemplate.update("DELETE FROM locations WHERE id IN (" + placeholders(locationIds) + ")", locationIds.toArray());
        }
        orderIds.clear();
        userIds.clear();
        menuItemIds.clear();
        locationIds.clear();
    }

    protected User createUser() {
        User user = new User();
        user.setPhone("9" + String.format("%09d", ThreadLocalRandom.current().nextLong(1_000_000_000L)));
        user.setPassword("not-used");
        user.setName("Wallet Test");
        user.setRole(UserRole.CUSTOMER);
        user.setTermsAccepted(true);
        User saved = userRepository.save(user);
        userIds.add(saved.getId());
        return saved;
    }

    protected void setBalance(User user, String amount) {
        walletService.getOrCreateWallet(user);
        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseThrow();
        wallet.setBalance(new BigDecimal(amount));
        walletRepository.save(wallet);
    }

    protected BigDecimal balanceOf(User user) {
        return walletRepository.findByUserId(user.getId()).orElseThrow().getBalance();
    }

    protected long successfulDebits(User user) {
        Long walletId = walletRepository.findByUserId(user.getId()).orElseThrow().getId();
        return txRepository.countByWallet_IdAndTypeAndStatus(walletId, TransactionType.DEBIT, TransactionStatus.SUCCESS);
    }

    protected long successfulCredits(User user) {
        Long walletId = walletRepository.findByUserId(user.getId()).orElseThrow().getId();
        return txRepository.countByWallet_IdAndTypeAndStatus(walletId, TransactionType.CREDIT, TransactionStatus.SUCCESS);
    }

    private static final AtomicInteger ORDER_NUMBER_SEQUENCE =
            new AtomicInteger(ThreadLocalRandom.current().nextInt(9000));

    /** Matches the orders_order_number_format_check constraint (V98): {@code ^[A-Z0-9_-]+-\d{8}-\d{4}$}. */
    protected static String nextTestOrderNumber() {
        return String.format("WT-%s-%04d",
                LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE),
                ORDER_NUMBER_SEQUENCE.incrementAndGet() % 10000);
    }

    protected Order createOrder(User owner, String grandTotal, PaymentMethod method, String paymentStatus) {
        Order order = new Order();
        order.setUserId(owner.getId());
        order.setPhone(owner.getPhone());
        order.setStatus(OrderStatus.ORDER_PLACED);
        order.setPaymentMethod(method);
        order.setPaymentStatus(paymentStatus);
        order.setGrandTotal(new BigDecimal(grandTotal));
        order.setOrderNumber(nextTestOrderNumber());
        order.setCreatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        orderIds.add(saved.getId());
        return saved;
    }

    protected String paymentStatusOf(Order order) {
        return orderRepository.findById(order.getId()).orElseThrow().getPaymentStatus();
    }

    /**
     * Starts all actions at the same time using a CyclicBarrier (no sleeps) and returns the
     * exception thrown by each action, or null when it completed normally.
     */
    protected List<Throwable> race(Runnable... actions) {
        CyclicBarrier startGate = new CyclicBarrier(actions.length);
        ExecutorService pool = Executors.newFixedThreadPool(actions.length);
        try {
            List<Future<Throwable>> futures = new ArrayList<>();
            for (Runnable action : actions) {
                Callable<Throwable> task = () -> {
                    startGate.await(15, TimeUnit.SECONDS);
                    try {
                        action.run();
                        return null;
                    } catch (Throwable t) {
                        return t;
                    }
                };
                futures.add(pool.submit(task));
            }
            List<Throwable> outcomes = new ArrayList<>();
            for (Future<Throwable> future : futures) {
                outcomes.add(future.get(60, TimeUnit.SECONDS));
            }
            return outcomes;
        } catch (Exception e) {
            throw new IllegalStateException("Concurrent race failed to run", e);
        } finally {
            pool.shutdownNow();
        }
    }

    protected static long failures(List<Throwable> outcomes) {
        return outcomes.stream().filter(Objects::nonNull).count();
    }

    protected static Throwable firstFailure(List<Throwable> outcomes) {
        return outcomes.stream().filter(Objects::nonNull).findFirst().orElseThrow();
    }

    // ---- Scenario 1: two concurrent debits, ₹100 balance, ₹80 each ----
    protected void scenarioConcurrentDebitsCannotOverspend() {
        User user = createUser();
        setBalance(user, "100.00");
        Order first = createOrder(user, "80.00", PaymentMethod.WALLET, "PENDING");
        Order second = createOrder(user, "80.00", PaymentMethod.WALLET, "PENDING");

        List<Throwable> outcomes = race(
                () -> walletService.payForOrder(user, first.getId(), new BigDecimal("80.00")),
                () -> walletService.payForOrder(user, second.getId(), new BigDecimal("80.00")));

        assertThat(failures(outcomes)).isEqualTo(1);
        assertThat(firstFailure(outcomes)).isInstanceOf(InsufficientBalanceException.class);
        assertThat(balanceOf(user)).isEqualByComparingTo("20.00");
        assertThat(successfulDebits(user)).isEqualTo(1);
    }

    // ---- Scenario 2: two concurrent payments for the same order ----
    protected void scenarioConcurrentPaymentsForSameOrderDebitOnce() {
        User user = createUser();
        setBalance(user, "500.00");
        Order order = createOrder(user, "80.00", PaymentMethod.WALLET, "PENDING");

        List<Throwable> outcomes = race(
                () -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80.00")),
                () -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80.00")));

        assertThat(failures(outcomes)).isEqualTo(1);
        assertThat(firstFailure(outcomes)).isInstanceOf(DuplicateTransactionException.class);
        assertThat(balanceOf(user)).isEqualByComparingTo("420.00");
        assertThat(successfulDebits(user)).isEqualTo(1);
        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
    }

    // ---- Scenario 3: debit succeeds, order payment update fails → full rollback ----
    protected void scenarioOrderUpdateFailureRollsBackDebit() {
        User user = createUser();
        setBalance(user, "500.00");
        Order order = createOrder(user, "80.00", PaymentMethod.WALLET, "PENDING");
        doThrow(new IllegalStateException("forced order update failure"))
                .when(orderService).markOrderPaidByWallet(anyLong());

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80.00")))
                .isInstanceOf(IllegalStateException.class);

        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(user)).isZero();
        assertThat(paymentStatusOf(order)).isEqualTo("PENDING");
    }

    // ---- Scenario 4: paying another user's order is rejected with no side effects ----
    protected void scenarioPayingAnotherUsersOrderIsRejected() {
        User owner = createUser();
        User attacker = createUser();
        setBalance(attacker, "500.00");
        Order order = createOrder(owner, "80.00", PaymentMethod.WALLET, "PENDING");

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(attacker, order.getId(), new BigDecimal("80.00")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Order not found");

        assertThat(balanceOf(attacker)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(attacker)).isZero();
        assertThat(paymentStatusOf(order)).isEqualTo("PENDING");
    }

    // ---- Scenario 5: already-paid order is rejected with no additional debit ----
    protected void scenarioAlreadyPaidOrderIsRejected() {
        User user = createUser();
        setBalance(user, "500.00");
        Order order = createOrder(user, "80.00", PaymentMethod.WALLET, "PAID");

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80.00")))
                .isInstanceOf(DuplicateTransactionException.class);

        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(user)).isZero();
    }

    // ---- Scenario 6: client amount is checked against the persisted order total ----
    protected void scenarioClientAmountMustMatchOrderTotal() {
        User user = createUser();
        setBalance(user, "500.00");
        Order order = createOrder(user, "80.00", PaymentMethod.WALLET, "PENDING");

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("1.00")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Amount does not match the order total");
        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("79.99")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(paymentStatusOf(order)).isEqualTo("PENDING");

        walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80"));
        assertThat(balanceOf(user)).isEqualByComparingTo("420.00");
        assertThat(paymentStatusOf(order)).isEqualTo("PAID");
    }

    // ---- Scenario 6b: non-wallet orders cannot be paid through the wallet endpoint ----
    protected void scenarioNonWalletOrderIsRejected() {
        User user = createUser();
        setBalance(user, "500.00");
        Order order = createOrder(user, "80.00", PaymentMethod.RAZORPAY, "PENDING");

        assertThatThrownBy(() -> walletOrderPaymentService.payOrderFromWallet(user, order.getId(), new BigDecimal("80.00")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(user)).isZero();
    }

    // ---- Scenario 7: concurrent credits on a missing wallet → no lost update, no duplicate wallet ----
    protected void scenarioConcurrentRefundsOnNewWalletDoNotLoseUpdates() {
        User user = createUser();
        Order first = createOrder(user, "50.00", PaymentMethod.WALLET, "PENDING");
        Order second = createOrder(user, "50.00", PaymentMethod.WALLET, "PENDING");

        List<Throwable> outcomes = race(
                () -> walletService.creditOrderRefund(user, first.getId(), new BigDecimal("50.00")),
                () -> walletService.creditOrderRefund(user, second.getId(), new BigDecimal("50.00")));

        assertThat(failures(outcomes)).isZero();
        assertThat(balanceOf(user)).isEqualByComparingTo("100.00");
        assertThat(successfulCredits(user)).isEqualTo(2);
        Long walletCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM wallets WHERE user_id = ?", Long.class, user.getId());
        assertThat(walletCount).isEqualTo(1L);
    }

    // ---- Scenario 8: cache is evicted after commit only, never on rollback ----
    protected void scenarioWalletCacheEvictedOnlyAfterCommit() {
        User user = createUser();
        walletService.getOrCreateWallet(user);
        Cache cache = cacheManager.getCache(WalletService.WALLET_BALANCE_CACHE);
        assertThat(cache).isNotNull();
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        cache.put(user.getId(), "stale-before-commit");
        Order committedOrder = createOrder(user, "10.00", PaymentMethod.WALLET, "PENDING");
        tx.executeWithoutResult(status -> {
            walletService.creditOrderRefund(user, committedOrder.getId(), new BigDecimal("10.00"));
            assertThat(cache.get(user.getId())).isNotNull();
        });
        assertThat(cache.get(user.getId())).isNull();

        cache.put(user.getId(), "stale-before-rollback");
        Order rolledBackOrder = createOrder(user, "10.00", PaymentMethod.WALLET, "PENDING");
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            walletService.creditOrderRefund(user, rolledBackOrder.getId(), new BigDecimal("10.00"));
            throw new IllegalStateException("forced rollback");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(cache.get(user.getId())).isNotNull();
        assertThat(balanceOf(user)).isEqualByComparingTo("10.00");
    }

    // ---- Scenario 9: concurrent first-time wallet creation, each caller in its own outer transaction ----
    protected void scenarioConcurrentWalletCreationReturnsSingleWallet() {
        User user = createUser();
        List<Long> walletIds = new CopyOnWriteArrayList<>();
        TransactionTemplate outer = new TransactionTemplate(transactionManager);
        Runnable create = () -> outer.executeWithoutResult(status ->
                walletIds.add(walletService.getOrCreateWallet(user).getId()));

        List<Throwable> outcomes = race(create, create);

        assertThat(failures(outcomes)).as("no UnexpectedRollbackException or uniqueness error escapes").isZero();
        assertThat(walletIds).hasSize(2);
        assertThat(walletIds.get(0)).isEqualTo(walletIds.get(1));
        Long walletCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM wallets WHERE user_id = ?", Long.class, user.getId());
        assertThat(walletCount).isEqualTo(1L);
    }

    // ---- Scenario 10: lazy wallet creation shares the caller's transaction (no REQUIRES_NEW connection) ----
    protected void scenarioLazyWalletCreationRollsBackWithCallerTransaction() {
        User user = createUser();
        TransactionTemplate outer = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> outer.executeWithoutResult(status -> {
            walletService.getOrCreateWallet(user);
            throw new IllegalStateException("forced failure after lazy wallet creation");
        })).isInstanceOf(IllegalStateException.class);

        Long walletCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM wallets WHERE user_id = ?", Long.class, user.getId());
        assertThat(walletCount).as("wallet row belongs to the rolled-back caller transaction").isZero();

        walletService.getOrCreateWallet(user);
        assertThat(walletRepository.findByUserId(user.getId())).isPresent();
    }

    private static String placeholders(List<?> values) {
        return String.join(",", java.util.Collections.nCopies(values.size(), "?"));
    }
}
