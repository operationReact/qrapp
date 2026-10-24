package com.broandbro.qrapp.service;

import com.broandbro.qrapp.controller.OrderController;
import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.Tag;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.exception.InsufficientBalanceException;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;

/**
 * Exercises the real {@code POST /orders} wallet branch against PostgreSQL. The order is created,
 * paid from the wallet and marked PAID inside one controller transaction; a failure at any step
 * must leave no order, no debit and no wallet transaction behind.
 *
 * Skipped unless QRAPP_IT_PG_URL is set (see {@link WalletCheckoutSafetyPostgresIT}).
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "QRAPP_IT_PG_URL", matches = ".+")
class WalletOrderCreationPostgresIT extends WalletCheckoutSafetyTestBase {

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("QRAPP_IT_PG_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("QRAPP_IT_PG_USER", "postgres"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("QRAPP_IT_PG_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @Autowired private OrderController orderController;
    @Autowired private LocationRepository locationRepository;
    @Autowired private MenuRepository menuRepository;
    @Autowired private PricingService pricingService;
    @Autowired private TagRepository tagRepository;
    @Autowired private org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Test
    void successfulWalletCheckoutDebitsOnceAndMarksOrderPaid() {
        User user = createUser();
        setBalance(user, "500.00");
        Fixture fixture = createFixture("80.00");

        ResponseEntity<Map<String, Object>> response = placeWalletOrder(user, fixture);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).containsEntry("paymentStatus", "PAID");
        Order order = orderRepository.findById(((Number) response.getBody().get("orderId")).longValue()).orElseThrow();
        assertThat(order.getPaymentStatus()).isEqualTo("PAID");
        assertThat(order.getPaymentMethod()).isEqualTo(PaymentMethod.WALLET);
        assertThat(successfulDebits(user)).isEqualTo(1);
        assertThat(balanceOf(user)).isEqualByComparingTo(new BigDecimal("500.00").subtract(order.getGrandTotal()));
    }

    @Test
    void insufficientBalanceCreatesNoOrderAndNoDebit() {
        User user = createUser();
        setBalance(user, "10.00");
        Fixture fixture = createFixture("80.00");

        assertThatThrownBy(() -> placeWalletOrder(user, fixture)).isInstanceOf(InsufficientBalanceException.class);

        assertThat(ordersFor(user)).isZero();
        assertThat(balanceOf(user)).isEqualByComparingTo("10.00");
        assertThat(walletTransactionCount(user)).isZero();
    }

    /**
     * The debit has already been applied inside the controller transaction when the order-paid
     * transition fails. Rollback must remove the order, its items, the debit and its transaction row.
     */
    @Test
    void orderPaidTransitionFailureRollsBackOrderDebitAndTransaction() {
        User user = createUser();
        setBalance(user, "500.00");
        Fixture fixture = createFixture("80.00");
        doThrow(new IllegalStateException("forced order update failure"))
                .when(orderService).markOrderPaidByWallet(anyLong());

        assertThatThrownBy(() -> placeWalletOrder(user, fixture)).isInstanceOf(IllegalStateException.class);

        assertThat(ordersFor(user)).as("order creation rolled back with the payment").isZero();
        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(user)).isZero();
        assertThat(walletTransactionCount(user)).isZero();
    }

    @Test
    void preOrderWalletCheckoutDebitsOnceAndMarksOrderPaid() {
        User user = createUser();
        setBalance(user, "500.00");
        Fixture fixture = createFixture("80.00", true);

        ResponseEntity<Map<String, Object>> response = placePreOrder(user, fixture);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).containsEntry("paymentStatus", "PAID");
        Order order = orderRepository.findById(((Number) response.getBody().get("orderId")).longValue()).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PRE_ORDERED);
        assertThat(order.getPaymentStatus()).isEqualTo("PAID");
        assertThat(order.getPaymentMethod()).isEqualTo(PaymentMethod.WALLET);
        assertThat(successfulDebits(user)).isEqualTo(1);
        assertThat(balanceOf(user)).isEqualByComparingTo(new BigDecimal("500.00").subtract(order.getGrandTotal()));
    }

    @Test
    void failureBeforeEnclosingCommitRollsBackWalletPaymentAndOrder() {
        User user = createUser();
        setBalance(user, "500.00");
        Fixture fixture = createFixture("80.00");
        TransactionTemplate outer = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> outer.executeWithoutResult(status -> {
            placeWalletOrder(user, fixture);
            throw new IllegalStateException("forced failure before order-creation commit");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(ordersFor(user)).as("order creation rolled back with the payment").isZero();
        assertThat(balanceOf(user)).isEqualByComparingTo("500.00");
        assertThat(successfulDebits(user)).isZero();
        assertThat(walletTransactionCount(user)).isZero();
    }

    private ResponseEntity<Map<String, Object>> placePreOrder(User user, Fixture fixture) {
        CreatePreOrderRequest req = new CreatePreOrderRequest();
        req.setPhone(user.getPhone());
        req.setPaymentMethod(PaymentMethod.WALLET);
        req.setLocationId(fixture.locationId());
        CreatePreOrderRequest.Item item = new CreatePreOrderRequest.Item();
        item.setItemId(fixture.menuItemId());
        item.setQuantity(1);
        req.setItems(List.of(item));
        req.setScheduledAt(LocalDateTime.now().plusDays(1));
        Authentication authentication = new UsernamePasswordAuthenticationToken(user.getPhone(), null, List.of());
        return orderController.createPreOrder(req, authentication);
    }

    private ResponseEntity<Map<String, Object>> placeWalletOrder(User user, Fixture fixture) {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPhone(user.getPhone());
        req.setPaymentMethod(PaymentMethod.WALLET);
        req.setLocationId(fixture.locationId());
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setItemId(fixture.menuItemId());
        item.setQuantity(1);
        req.setItems(List.of(item));
        Authentication authentication = new UsernamePasswordAuthenticationToken(user.getPhone(), null, List.of());
        return orderController.createOrder(req, authentication);
    }

    private Fixture createFixture(String price) {
        return createFixture(price, false);
    }

    private Fixture createFixture(String price, boolean preOrderOnly) {
        Location location = new Location();
        location.setName("Wallet Atomicity Test");
        location.setCode("WA" + String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000)) + "-TG-001");
        location.setStateUt("Telangana");
        location.setActive(true);
        location.setCreatedAt(Instant.now());
        location = locationRepository.save(location);
        locationIds.add(location.getId());

        MenuItem menuItem = new MenuItem();
        menuItem.setName("Wallet Atomicity Item");
        menuItem.setLocation(location);
        menuItem.setIsVeg(true);
        menuItem.setAvailable(true);
        if (preOrderOnly) {
            menuItem.setTag(preOrderTag());
        }
        menuItem = menuRepository.save(menuItem);
        menuItemIds.add(menuItem.getId());
        pricingService.setSellingPrice(new PriceSetRequest(menuItem.getId(), new BigDecimal(price), null, "wallet atomicity test"));
        return new Fixture(location.getId(), menuItem.getId());
    }

    private Tag preOrderTag() {
        return tagRepository.findByName("PreOrderOnly")
                .orElseGet(() -> tagRepository.save(new Tag(null, "PreOrderOnly")));
    }

    private long ordersFor(User user) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM orders WHERE user_id = ?", Long.class, user.getId());
        return count == null ? 0 : count;
    }

    private long walletTransactionCount(User user) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?",
                Long.class, user.getId());
        return count == null ? 0 : count;
    }

    private record Fixture(Long locationId, Long menuItemId) {}
}
