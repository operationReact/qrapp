package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.exception.OrderValidationException;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for location-specific order ID generation.
 *
 * Tests the complete flow:
 * 1. Order creation via OrderService
 * 2. Location code validation
 * 3. Order number generation with location code
 * 4. Immutable location code storage
 *
 * Uses real database (test profile) to ensure transactional behavior is correct.
 */
@SpringBootTest
@ActiveProfiles("test")
class OrderServiceLocationSpecificIdIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private MenuRepository menuRepository;

    /**
     * TEST 1: Order creation with valid location includes location code in order number
     *
     * Given: A location with code "PRAGATI-TG-001"
     * And: A menu item for that location
     * When: Creating an order
     * Then: Order number starts with PRAGATI-TG-001-
     * And: locationCode field is populated
     */
    @Test
    @Transactional
    void orderCreationIncludesLocationCodeInOrderNumber() {
        // Setup: Create a location with code
        Location location = new Location();
        location.setName("Test Location");
        location.setCode("TEST-TG-001");
        location.setStateUt("Telangana");
        location.setActive(true);
        location.setCreatedAt(Instant.now());
        location = locationRepository.save(location);

        // Setup: Create a menu item for this location
        MenuItem menuItem = new MenuItem();
        menuItem.setName("Test Item");
        menuItem.setLocation(location);
        menuItem.setIsVeg(true);
        menuItem.setAvailable(true);
        menuItem = menuRepository.save(menuItem);

        // Create order
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPhone("9999999999");
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setItemId(menuItem.getId());
        item.setQuantity(1);
        req.setItems(List.of(item));

        User user = new User();
        user.setPhone("9999999999");
        user.setRole(UserRole.CUSTOMER);
        user.setDefaultLocation(location);

        OrderService.CreateOrderResult result = orderService.createOrder(req, user);
        Order order = result.order();

        // Verify order number includes location code
        assertThat(order.getOrderNumber()).startsWith("TEST-TG-001-");
        assertThat(order.getLocationCode()).isEqualTo("TEST-TG-001");
        assertThat(order.getLocation()).isNotNull();
        assertThat(order.getLocation().getId()).isEqualTo(location.getId());
    }

    /**
     * TEST 2: Order creation fails if location has no location code
     *
     * Given: A location with null location code
     * When: Creating an order
     * Then: OrderValidationException is thrown with LOCATION_CODE_MISSING
     */
    @Test
    @Transactional
    void orderCreationFailsIfLocationHasNoCode() {
        // Setup: Create location without code
        Location location = new Location();
        location.setName("No Code Location");
        location.setCode("");  // No code
        location.setStateUt("Telangana");
        location.setActive(true);
        location.setCreatedAt(Instant.now());
        location = locationRepository.save(location);

        // Setup: Create menu item for this location
        MenuItem menuItem = new MenuItem();
        menuItem.setName("Test Item");
        menuItem.setLocation(location);
        menuItem.setIsVeg(true);
        menuItem.setAvailable(true);
        menuItem = menuRepository.save(menuItem);

        // Create order request
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPhone("9999999999");
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setItemId(menuItem.getId());
        item.setQuantity(1);
        req.setItems(List.of(item));

        User user = new User();
        user.setPhone("9999999999");
        user.setRole(UserRole.CUSTOMER);

        // Verify exception is thrown
        assertThatThrownBy(() -> orderService.createOrder(req, user))
                .isInstanceOf(OrderValidationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "LOCATION_CODE_MISSING");
    }

    /**
     * TEST 3: Two concurrent orders at different locations have different order numbers
     *
     * Given: Two locations with codes
     * When: Creating orders for each location
     * Then: Order numbers start with different location codes
     */
    @Test
    @Transactional
    void differentLocationsHaveDifferentOrderNumbers() {
        // Setup: Create first location
        Location loc1 = new Location();
        loc1.setName("Location 1");
        loc1.setCode("LOC1-TG-001");
        loc1.setStateUt("Telangana");
        loc1.setActive(true);
        loc1.setCreatedAt(Instant.now());
        loc1 = locationRepository.save(loc1);

        // Setup: Create second location
        Location loc2 = new Location();
        loc2.setName("Location 2");
        loc2.setCode("LOC2-TG-002");
        loc2.setStateUt("Telangana");
        loc2.setActive(true);
        loc2.setCreatedAt(Instant.now());
        loc2 = locationRepository.save(loc2);

        // Setup: Create menu items
        MenuItem item1 = new MenuItem();
        item1.setName("Item 1");
        item1.setLocation(loc1);
        item1.setIsVeg(true);
        item1.setAvailable(true);
        item1 = menuRepository.save(item1);

        MenuItem item2 = new MenuItem();
        item2.setName("Item 2");
        item2.setLocation(loc2);
        item2.setIsVeg(true);
        item2.setAvailable(true);
        item2 = menuRepository.save(item2);

        // Create first order
        CreateOrderRequest req1 = new CreateOrderRequest();
        req1.setPhone("1111111111");
        CreateOrderRequest.Item orderItem1 = new CreateOrderRequest.Item();
        orderItem1.setItemId(item1.getId());
        orderItem1.setQuantity(1);
        req1.setItems(List.of(orderItem1));

        User user1 = new User();
        user1.setPhone("1111111111");
        user1.setRole(UserRole.CUSTOMER);
        user1.setDefaultLocation(loc1);

        Order order1 = orderService.createOrder(req1, user1).order();

        // Create second order
        CreateOrderRequest req2 = new CreateOrderRequest();
        req2.setPhone("2222222222");
        CreateOrderRequest.Item orderItem2 = new CreateOrderRequest.Item();
        orderItem2.setItemId(item2.getId());
        orderItem2.setQuantity(1);
        req2.setItems(List.of(orderItem2));

        User user2 = new User();
        user2.setPhone("2222222222");
        user2.setRole(UserRole.CUSTOMER);
        user2.setDefaultLocation(loc2);

        Order order2 = orderService.createOrder(req2, user2).order();

        // Verify different location codes
        assertThat(order1.getOrderNumber()).startsWith("LOC1-TG-001-");
        assertThat(order2.getOrderNumber()).startsWith("LOC2-TG-002-");
        assertThat(order1.getLocationCode()).isEqualTo("LOC1-TG-001");
        assertThat(order2.getLocationCode()).isEqualTo("LOC2-TG-002");
    }

    /**
     * TEST 4: Order location code is immutable (stored as snapshot)
     *
     * Even if the location's code changes after order creation,
     * the stored locationCode on the order should not change.
     */
    @Test
    @Transactional
    void orderLocationCodeIsImmutable() {
        // Setup: Create location with code
        Location location = new Location();
        location.setName("Mutable Location");
        location.setCode("ORIGINAL-TG-001");
        location.setStateUt("Telangana");
        location.setActive(true);
        location.setCreatedAt(Instant.now());
        location = locationRepository.save(location);

        // Setup: Create menu item
        MenuItem menuItem = new MenuItem();
        menuItem.setName("Test Item");
        menuItem.setLocation(location);
        menuItem.setIsVeg(true);
        menuItem.setAvailable(true);
        menuItem = menuRepository.save(menuItem);

        // Create order
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPhone("9999999999");
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setItemId(menuItem.getId());
        item.setQuantity(1);
        req.setItems(List.of(item));

        User user = new User();
        user.setPhone("9999999999");
        user.setRole(UserRole.CUSTOMER);
        user.setDefaultLocation(location);

        Order order = orderService.createOrder(req, user).order();
        String originalOrderNumber = order.getOrderNumber();
        String originalLocationCode = order.getLocationCode();

        // Verify order was created with original code
        assertThat(order.getOrderNumber()).startsWith("ORIGINAL-TG-001-");
        assertThat(order.getLocationCode()).isEqualTo("ORIGINAL-TG-001");

        // Now change the location's code (simulate admin change)
        location.setCode("CHANGED-TG-999");
        locationRepository.save(location);

        // Fetch the order from database
        Order fetchedOrder = orderRepository.findById(order.getId()).orElseThrow();

        // Verify order's location code remains unchanged
        assertThat(fetchedOrder.getOrderNumber()).isEqualTo(originalOrderNumber);
        assertThat(fetchedOrder.getLocationCode()).isEqualTo(originalLocationCode);
        assertThat(fetchedOrder.getOrderNumber()).startsWith("ORIGINAL-TG-001-");
    }

    /**
     * TEST 5: Legacy orders without locationCode field still work
     *
     * Backward compatibility: Orders created before locationCode field
     * should still be queryable and displayable.
     */
    @Test
    @Transactional
    void supportsLegacyOrdersWithoutLocationCode() {
        // Setup: Create location
        Location location = new Location();
        location.setName("Test Location");
        location.setCode("TEST-TG-001");
        location.setStateUt("Telangana");
        location.setActive(true);
        location.setCreatedAt(Instant.now());
        location = locationRepository.save(location);

        // Create order with legacy format (manually, simulating old data)
        Order legacyOrder = new Order();
        legacyOrder.setPhone("1111111111");
        legacyOrder.setOrderNumber("BB-20260901-0001");  // Legacy format
        legacyOrder.setLocationCode(null);  // Legacy: not set
        legacyOrder.setLocation(location);
        legacyOrder = orderRepository.save(legacyOrder);

        // Fetch and verify legacy order is still accessible
        Order fetched = orderRepository.findById(legacyOrder.getId()).orElseThrow();
        assertThat(fetched.getOrderNumber()).isEqualTo("BB-20260901-0001");
        assertThat(fetched.getLocationCode()).isNull();
    }
}
