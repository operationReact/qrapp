package com.broandbro.qrapp;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.entity.WalletTransaction;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WalletTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@Profile("default")
public class DataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataLoader.class);

    private final MenuRepository menuRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PasswordEncoder passwordEncoder;

    public DataLoader(MenuRepository menuRepository,
                      UserRepository userRepository,
                      WalletRepository walletRepository,
                      WalletTransactionRepository walletTransactionRepository,
                      OrderRepository orderRepository,
                      OrderItemRepository orderItemRepository,
                      PasswordEncoder passwordEncoder) {
        this.menuRepository = menuRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            List<MenuItem> menuItems = seedMenuItemsIfNeeded();
            List<User> users = seedUsersIfNeeded();
            List<Wallet> wallets = seedWalletsIfNeeded(users);
            seedWalletTransactionsIfNeeded(wallets);
            List<Order> orders = seedOrdersIfNeeded(users);
            seedOrderItemsIfNeeded(menuItems, orders);

            log.info("Mock data check complete: menu={}, users={}, wallets={}, walletTransactions={}, orders={}, orderItems={}",
                    menuRepository.count(),
                    userRepository.count(),
                    walletRepository.count(),
                    walletTransactionRepository.count(),
                    orderRepository.count(),
                    orderItemRepository.count());
        } catch (Exception ex) {
            log.error("Failed to seed mock data", ex);
        }
    }

    private List<MenuItem> seedMenuItemsIfNeeded() {
        if (menuRepository.count() > 0) {
            log.info("Menu already present - skipping menu seed");
            return menuRepository.findAll();
        }

        final String breakfastImg = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
        final String lunchImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
        final String sandwichImg = "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80";
        final String maggiImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
        final String bowlsImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
        final String dosaImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
        final String sidesImg = "https://images.unsplash.com/photo-1542834369-f10ebf06d3fb?auto=format&fit=crop&w=800&q=80";

        List<MenuItem> items = new ArrayList<>();
        items.add(menuItem("Healthy Oat Meal", 99, "Breakfast Specials", true, true, "", breakfastImg, true));
        items.add(menuItem("Oats Banana Smoothie", 89, "Breakfast Specials", true, true, "", breakfastImg, true));
        items.add(menuItem("Peanut Butter Toast", 89, "Breakfast Specials", true, false, "", breakfastImg, true));
        items.add(menuItem("Puri Bhaji", 49, "Breakfast Specials", true, false, "", breakfastImg, true));
        items.add(menuItem("Combo Meal", 99, "Lunch Meals", true, false, "", lunchImg, true));
        items.add(menuItem("Chapathi Combo", 99, "Lunch Meals", true, false, "", lunchImg, true));
        items.add(menuItem("Mini Thali", 129, "Lunch Meals", true, false, "", lunchImg, true));
        items.add(menuItem("Full Meal Thali", 159, "Lunch Meals", true, false, "", lunchImg, true));
        items.add(menuItem("Veg Cheese Sandwich", 69, "Sandwiches", true, true, "", sandwichImg, true));
        items.add(menuItem("Paneer Cheese Sandwich", 89, "Sandwiches", true, false, "", sandwichImg, true));
        items.add(menuItem("Corn Cheese Sandwich", 79, "Sandwiches", true, false, "", sandwichImg, true));
        items.add(menuItem("Corn Sandwich", 69, "Sandwiches", true, false, "", sandwichImg, true));
        items.add(menuItem("Cheese Sandwich", 49, "Sandwiches", true, false, "", sandwichImg, true));
        items.add(menuItem("Fried Maggi", 69, "Maggi Corner", true, false, "", maggiImg, false));
        items.add(menuItem("Veg Maggi", 59, "Maggi Corner", true, true, "", maggiImg, true));
        items.add(menuItem("Sweet Corn Cup", 59, "Fresh & Healthy Bowls", true, true, "", bowlsImg, true));
        items.add(menuItem("Sprouts Chaat", 79, "Fresh & Healthy Bowls", true, false, "", bowlsImg, true));
        items.add(menuItem("Fruit Bowl", 49, "Fresh & Healthy Bowls", true, false, "", bowlsImg, true));
        items.add(menuItem("Yogurt Fruit Bowl", 169, "Fresh & Healthy Bowls", true, false, "", bowlsImg, true));
        items.add(menuItem("Plain Dosa", 39, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Onion Dosa", 49, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Ghee Dosa", 49, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Karam Dosa", 49, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Masala Dosa", 59, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Ghee Karam Dosa", 59, "Dosa Corner", true, false, "", dosaImg, true));
        items.add(menuItem("Chicken Sandwich", 119, "Sandwiches", true, true, "Grilled chicken with mayo", sandwichImg, false));
        items.add(menuItem("Chicken Thali", 189, "Lunch Meals", true, false, "Rice, curry and grilled chicken", lunchImg, false));
        items.add(menuItem("Fried Chicken Pieces", 149, "Sides", true, false, "Crispy fried chicken", sidesImg, false));

        List<MenuItem> saved = menuRepository.saveAll(items);
        log.info("Seeded {} mock menu items", saved.size());
        return saved;
    }

    private List<User> seedUsersIfNeeded() {
        if (userRepository.count() > 0) {
            log.info("Users already present - skipping user seed");
            return userRepository.findAll();
        }

        User u1 = User.builder()
                .phone("9000000001")
                .password(passwordEncoder.encode("Password@123"))
                .name("Aarav")
                .token("mock-token-user-1")
                .createdAt(Instant.now().minusSeconds(86400))
                .build();

        User u2 = User.builder()
                .phone("123")
                .password(passwordEncoder.encode("123"))
                .name("Aarav")
                .token("mock-token-user-3")
                .createdAt(Instant.now().minusSeconds(86400))
                .build();

        List<User> saved = userRepository.saveAll(List.of(u1, u2));
        log.info("Seeded {} mock users", saved.size());
        return saved;
    }

    private List<Wallet> seedWalletsIfNeeded(List<User> users) {
        if (walletRepository.count() > 0) {
            log.info("Wallets already present - skipping wallet seed");
            return walletRepository.findAll();
        }

        if (users.isEmpty()) {
            users = userRepository.findAll();
        }

        List<Wallet> wallets = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            Wallet wallet = Wallet.builder()
                    .user(users.get(i))
                    .balance(i == 0 ? 15000L : 7200L)
                    .build();
            wallets.add(wallet);
        }

        List<Wallet> saved = walletRepository.saveAll(wallets);
        log.info("Seeded {} mock wallets", saved.size());
        return saved;
    }

    private void seedWalletTransactionsIfNeeded(List<Wallet> wallets) {
        if (walletTransactionRepository.count() > 0) {
            log.info("Wallet transactions already present - skipping wallet transaction seed");
            return;
        }

        if (wallets.isEmpty()) {
            wallets = walletRepository.findAll();
        }
        if (wallets.isEmpty()) {
            log.warn("Skipping wallet transaction seed because no wallets are available");
            return;
        }

        List<WalletTransaction> transactions = new ArrayList<>();
        Wallet first = wallets.get(0);
        transactions.add(WalletTransaction.builder()
                .wallet(first)
                .amount(20000L)
                .type(TransactionType.CREDIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId("mock-credit-001")
                .createdAt(Instant.now().minusSeconds(68000))
                .build());
        transactions.add(WalletTransaction.builder()
                .wallet(first)
                .amount(5000L)
                .type(TransactionType.DEBIT)
                .status(TransactionStatus.SUCCESS)
                .referenceId("mock-debit-001")
                .createdAt(Instant.now().minusSeconds(30000))
                .build());

        if (wallets.size() > 1) {
            Wallet second = wallets.get(1);
            transactions.add(WalletTransaction.builder()
                    .wallet(second)
                    .amount(10000L)
                    .type(TransactionType.CREDIT)
                    .status(TransactionStatus.SUCCESS)
                    .referenceId("mock-credit-002")
                    .createdAt(Instant.now().minusSeconds(54000))
                    .build());
            transactions.add(WalletTransaction.builder()
                    .wallet(second)
                    .amount(2800L)
                    .type(TransactionType.DEBIT)
                    .status(TransactionStatus.PENDING)
                    .referenceId("mock-debit-002")
                    .createdAt(Instant.now().minusSeconds(8000))
                    .build());
        }

        walletTransactionRepository.saveAll(transactions);
        log.info("Seeded {} mock wallet transactions", transactions.size());
    }

    private List<Order> seedOrdersIfNeeded(List<User> users) {
        if (orderRepository.count() > 0) {
            log.info("Orders already present - skipping order seed");
            return orderRepository.findAll();
        }

        if (users.isEmpty()) {
            users = userRepository.findAll();
        }
        if (users.isEmpty()) {
            log.warn("Skipping order seed because no users are available");
            return List.of();
        }

        List<Order> orders = new ArrayList<>();
        orders.add(order(users.get(0).getPhone(), OrderStatus.COMPLETED, "PAID", "order_mock_001", LocalDateTime.now().minusHours(5)));
        orders.add(order(users.get(0).getPhone(), OrderStatus.READY, "PAID", "order_mock_002", LocalDateTime.now().minusHours(2)));

        String secondPhone = users.size() > 1 ? users.get(1).getPhone() : users.get(0).getPhone();
        orders.add(order(secondPhone, OrderStatus.PLACED, "PENDING", "order_mock_003", LocalDateTime.now().minusMinutes(30)));

        List<Order> saved = orderRepository.saveAll(orders);
        log.info("Seeded {} mock orders", saved.size());
        return saved;
    }

    private void seedOrderItemsIfNeeded(List<MenuItem> menuItems, List<Order> orders) {
        if (orderItemRepository.count() > 0) {
            log.info("Order items already present - skipping order item seed");
            return;
        }

        if (menuItems.isEmpty()) {
            menuItems = menuRepository.findAll();
        }
        if (orders.isEmpty()) {
            orders = orderRepository.findAll();
        }

        if (menuItems.size() < 3 || orders.isEmpty()) {
            log.warn("Skipping order item seed because not enough menu items or orders are available");
            return;
        }

        List<OrderItem> items = new ArrayList<>();
        items.add(orderItem(orders.get(0).getId(), menuItems.get(0).getId(), 1));
        items.add(orderItem(orders.get(0).getId(), menuItems.get(8).getId(), 2));
        items.add(orderItem(orders.get(1).getId(), menuItems.get(4).getId(), 1));
        items.add(orderItem(orders.get(1).getId(), menuItems.get(14).getId(), 1));

        Order lastOrder = orders.get(orders.size() - 1);
        items.add(orderItem(lastOrder.getId(), menuItems.get(20).getId(), 2));
        items.add(orderItem(lastOrder.getId(), menuItems.get(25).getId(), 1));

        orderItemRepository.saveAll(items);
        log.info("Seeded {} mock order items", items.size());
    }

    private MenuItem menuItem(String name, double price, String category, boolean available, boolean recommended,
                              String description, String imageUrl, Boolean isVeg) {
        MenuItem item = new MenuItem();
        item.setName(name);
        item.setPrice(price);
        item.setCategory(category);
        item.setAvailable(available);
        item.setRecommended(recommended);
        item.setDescription(description);
        item.setImageUrl(imageUrl);
        item.setIsVeg(isVeg);
        return item;
    }

    private Order order(String phone, OrderStatus status, String paymentStatus, String razorpayOrderId, LocalDateTime createdAt) {
        Order order = new Order();
        order.setPhone(phone);
        order.setStatus(status);
        order.setPaymentStatus(paymentStatus);
        order.setRazorpayOrderId(razorpayOrderId);
        order.setCreatedAt(createdAt);
        return order;
    }

    private OrderItem orderItem(Long orderId, Long itemId, int quantity) {
        OrderItem item = new OrderItem();
        item.setOrderId(orderId);
        item.setItemId(itemId);
        item.setQuantity(quantity);
        return item;
    }
}
