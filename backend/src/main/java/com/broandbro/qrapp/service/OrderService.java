package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.AdminOrderDashboardResponse;
import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.dto.AdminPreOrderDashboardResponse;
import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.OrderStatusHistory;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.engine.CartItemContext;
import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.EligibilityResult;
import com.broandbro.qrapp.promotion.engine.UserContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRuleEngine;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.entity.PromotionUsage;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.promotion.repository.PromotionUsageRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.OrderStatusHistoryRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private static final Set<OrderStatus> LIVE_STATUSES = EnumSet.of(OrderStatus.ORDER_PLACED, OrderStatus.PREPARING, OrderStatus.READY);
    private static final String PRE_ORDER_ONLY_TAG = "PreOrderOnly";

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuRepository menuRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final WhatsAppService whatsappService;
    private final OrderNumberGenerator orderNumberGenerator;
    private final PricingService pricingService;
    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository promotionUsageRepository;
    private final PromotionRuleEngine promotionRuleEngine;
    private final MilestoneCouponService milestoneCouponService;
    private final com.broandbro.qrapp.repository.UserRepository userRepository;

    /**
     * Creates a new order with a human-readable order number.
     *
     * Thread-safe order number generation happens inside this transaction:
     * 1. Acquires pessimistic write lock on today's sequence row
     * 2. Increments the sequence atomically
     * 3. Generates formatted order number (BB-YYYYMMDD-XXXX)
     * 4. Associates order number with the new order
     *
     * @param req the order creation request
     * @param user the user placing the order (optional)
     * @return the created order with order_number field populated
     * @throws RuntimeException if order number generation fails
     */
    @Transactional
    public CreateOrderResult createOrder(CreateOrderRequest req, User user) {
        // ── Guard: reject PreOrderOnly items in regular orders ──────────────
        List<Long> requestedIds = req.getItems().stream()
                .map(CreateOrderRequest.Item::getItemId)
                .toList();
        java.util.Set<Long> preOrderOnlyIds = resolvePreOrderOnlyItemIds(requestedIds);
        if (!preOrderOnlyIds.isEmpty()) {
            throw new IllegalArgumentException(
                "Item(s) " + preOrderOnlyIds + " are only available as pre-orders. " +
                "Please use the pre-order flow to schedule them.");
        }

        LocalDateTime now = LocalDateTime.now();
        Order order = new Order();
        order.setPhone(user != null ? user.getPhone() : req.getPhone());
        order.setUserId(user != null ? user.getId() : null);
        order.setStatus(OrderStatus.ORDER_PLACED);
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY);
        order.setCreatedAt(now);
        order.setLastStatusChangedAt(now);
        order.setPriority(OrderPriority.NORMAL);

        // Generate human-readable order number with pessimistic locking
        String orderNumber = orderNumberGenerator.generateOrderNumber(now.toLocalDate());
        order.setOrderNumber(orderNumber);

        // ── Step 1: pre-compute all item snapshots BEFORE any DB save ──────────
        // Build (item, snapshot) pairs so we can sum up totals first
        List<Object[]> itemSnaps = new java.util.ArrayList<>(); // [CreateOrderRequest.Item, OrderItemSnapshot]
        java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

        for (CreateOrderRequest.Item i : req.getItems()) {
            MenuItem menuItem = menuRepository.findById(i.getItemId())
                    .orElseThrow(() -> new RuntimeException("MenuItem not found: " + i.getItemId()));
            Long shopId = menuItem.getShop() != null ? menuItem.getShop().getId() : null;
            PricingService.OrderItemSnapshot snap = pricingService.createSnapshot(i.getItemId(), shopId, i.getQuantity());
            itemSnaps.add(new Object[]{i, snap});
            subtotal = subtotal.add(snap.lineTotal() != null ? snap.lineTotal() : java.math.BigDecimal.ZERO);
        }

        // ── Step 2: set order-level totals before the first (only) save ─────────
        java.math.BigDecimal couponDiscount = java.math.BigDecimal.ZERO;

        // Apply promotion if code provided
        if (req.getPromotionCode() != null && !req.getPromotionCode().isBlank() && user != null) {
            couponDiscount = resolvePromotionDiscount(req, user, subtotal, couponDiscount);
            if (couponDiscount.compareTo(java.math.BigDecimal.ZERO) > 0) {
                order.setCouponCode(req.getPromotionCode().toUpperCase());
                order.setCouponDiscount(couponDiscount);
            }
        }
        java.math.BigDecimal tax = java.math.BigDecimal.ZERO;
        order.setSubtotal(subtotal);
        order.setTax(tax);
        order.setGrandTotal(subtotal.subtract(couponDiscount).add(tax));

        // ── Step 3: single save — order persisted with correct totals + gets ID ─
        order = orderRepo.save(order);
        recordStatusHistory(order.getId(), null, OrderStatus.ORDER_PLACED, "Order created", "SYSTEM", now);

        // Record promotion usage (after order gets its ID)
        if (req.getPromotionCode() != null && !req.getPromotionCode().isBlank()
                && user != null && couponDiscount.compareTo(java.math.BigDecimal.ZERO) > 0) {
            recordPromotionUsage(req.getPromotionCode(), user, order, couponDiscount, subtotal);
        }

        // ── Milestone coupon check ─────────────────────────────────────────────
        // Runs in a separate transaction — a failure here never rolls back the order
        java.util.List<String> awardedCoupons = java.util.List.of();
        if (user != null) {
            awardedCoupons = milestoneCouponService.checkAndAwardMilestones(user, order.getGrandTotal());
            if (!awardedCoupons.isEmpty()) {
                log.info("Milestone coupons awarded for order {}: {}", order.getId(), awardedCoupons);
            }
        }

        // ── Step 4: persist order items ──────────────────────────────────────────
        for (Object[] pair : itemSnaps) {
            CreateOrderRequest.Item i   = (CreateOrderRequest.Item) pair[0];
            PricingService.OrderItemSnapshot snap = (PricingService.OrderItemSnapshot) pair[1];
            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setItemId(i.getItemId());
            oi.setQuantity(i.getQuantity());
            oi.setSellingPriceSnapshot(snap.sellingPriceSnapshot());
            oi.setCostPriceSnapshot(snap.costPriceSnapshot());
            oi.setProfitSnapshot(snap.profitSnapshot());
            oi.setLineTotal(snap.lineTotal());
            orderItemRepo.save(oi);
        }

        return new CreateOrderResult(order, awardedCoupons);
    }

    /** Wraps the created order together with any milestone coupons awarded during this order. */
    public record CreateOrderResult(Order order, java.util.List<String> awardedCoupons) {}

    @Transactional(readOnly = true)
    public List<UserOrderSummaryResponse> getOrdersForUser(User user) {
        Map<Long, Order> orderMap = new LinkedHashMap<>();

        if (user.getId() != null) {
            orderRepo.findAllByUserIdOrderByCreatedAtDescIdDesc(user.getId())
                    .forEach(order -> orderMap.put(order.getId(), order));
        }

        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            orderRepo.findAllByPhoneOrderByCreatedAtDescIdDesc(user.getPhone())
                    .forEach(order -> orderMap.putIfAbsent(order.getId(), order));
        }

        List<Order> orders = orderMap.values().stream()
                .sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Order::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        if (orders.isEmpty()) {
            return List.of();
        }

        List<Long> orderIds = orders.stream().map(Order::getId).filter(Objects::nonNull).toList();
        List<OrderItem> orderItems = orderIds.isEmpty() ? List.of() : orderItemRepo.findAllByOrderIdIn(orderIds);

        Map<Long, List<OrderItem>> itemsByOrderId = orderItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        Set<Long> menuIds = orderItems.stream()
                .map(OrderItem::getItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, MenuItem> menuById = menuIds.isEmpty()
                ? Map.of()
                : menuRepository.findAllById(menuIds).stream()
                .collect(Collectors.toMap(MenuItem::getId, item -> item));

        List<UserOrderSummaryResponse> response = new ArrayList<>();
        for (Order order : orders) {
            UserOrderSummaryResponse summary = new UserOrderSummaryResponse();
            summary.setId(order.getId());
            summary.setOrderNumber(order.getOrderNumber());
            summary.setStatus(order.getStatus());
            summary.setPaymentStatus(order.getPaymentStatus());
            summary.setCreatedAt(order.getCreatedAt());
            summary.setScheduledAt(order.getScheduledAt());
            summary.setPreOrder(order.isPreOrder());

            double total = 0;
            List<UserOrderSummaryResponse.ItemSummary> itemSummaries = new ArrayList<>();
            for (OrderItem orderItem : itemsByOrderId.getOrDefault(order.getId(), List.of())) {
                MenuItem menuItem = menuById.get(orderItem.getItemId());
                UserOrderSummaryResponse.ItemSummary itemSummary = new UserOrderSummaryResponse.ItemSummary();
                itemSummary.setItemId(orderItem.getItemId());
                itemSummary.setQuantity(orderItem.getQuantity());
                if (menuItem != null) {
                    itemSummary.setName(menuItem.getName());
                    // Use immutable snapshot price; fall back to current price for legacy rows
                    double unitPrice = orderItem.getSellingPriceSnapshot() != null
                            ? orderItem.getSellingPriceSnapshot().doubleValue()
                            : pricingService.getCurrentSellingPrice(menuItem.getId()).doubleValue();
                    itemSummary.setPrice(unitPrice);
                    itemSummary.setImageUrl(menuItem.getImageUrl());
                    itemSummary.setIsVeg(menuItem.getIsVeg());
                    total += unitPrice * orderItem.getQuantity();
                }
                itemSummaries.add(itemSummary);
            }

            summary.setItems(itemSummaries);
            summary.setTotal(total);
            response.add(summary);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public long calculateAmountForItems(List<CreateOrderRequest.Item> items) {
        if (items == null || items.isEmpty()) {
            return 0L;
        }

        Map<Long, Integer> quantityByItemId = items.stream()
                .filter(item -> item.getItemId() != null && item.getQuantity() > 0)
                .collect(Collectors.toMap(CreateOrderRequest.Item::getItemId, CreateOrderRequest.Item::getQuantity, Integer::sum));

        if (quantityByItemId.isEmpty()) {
            return 0L;
        }

        double total = menuRepository.findAllById(quantityByItemId.keySet()).stream()
                .mapToDouble(item -> pricingService.getCurrentSellingPrice(item.getId()).doubleValue() * quantityByItemId.getOrDefault(item.getId(), 0))
                .sum();
        // Return rupees (whole number). Paise conversion only happens for Razorpay (see calculateAmountForOrder).
        return Math.round(total);
    }

    /**
     * Calculate total amount in paise (smallest currency unit) for Razorpay.
     * Razorpay requires paise – do NOT use this for wallet debits.
     */
    public int calculateAmountForOrder(Long orderId) {
        double total = orderItemRepo.calculateOrderTotal(orderId);

        if (total <= 0.0) return 0;
        return (int) Math.round(total * 100);
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> getAdminOrders(Optional<String> status,
                                                   Optional<String> paymentStatus,
                                                   Optional<String> query,
                                                   boolean liveOnly,
                                                   Pageable pageable) {
        // Pre-orders are managed exclusively via /admin/pre-orders — exclude them here
        Specification<Order> specification = (root, cq, cb) -> cb.isFalse(root.get("preOrder"));

        if (status.isPresent() && !status.get().isBlank()) {
            OrderStatus parsedStatus = parseStatus(status.get());
            specification = specification.and((root, cq, cb) -> cb.equal(root.get("status"), parsedStatus));
        }

        if (paymentStatus.isPresent() && !paymentStatus.get().isBlank()) {
            String normalizedPaymentStatus = paymentStatus.get().trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, cq, cb) -> cb.equal(cb.upper(root.get("paymentStatus")), normalizedPaymentStatus));
        }

        if (liveOnly) {
            specification = specification.and((root, cq, cb) -> root.get("status").in(LIVE_STATUSES));
        }

        if (query.isPresent() && !query.get().isBlank()) {
            specification = specification.and(matchesQuery(query.get()));
        }

        Pageable effectivePageable = sanitizePageable(pageable);
        Page<Order> page = orderRepo.findAll(specification, effectivePageable);
        List<AdminOrderResponse> content = buildAdminOrderResponses(page.getContent());
        return new PageImpl<>(content, effectivePageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> getLiveOrders(int limit) {
        int safeLimit = Math.max(1, Math.min(30, limit));
        // Explicitly exclude pre-orders — they are managed via the pre-orders admin page only
        return buildAdminOrderResponses(
                orderRepo.findAllByStatusInAndPreOrderFalseOrderByCreatedAtAscIdAsc(
                        LIVE_STATUSES, PageRequest.of(0, safeLimit))
        );
    }

    @Transactional(readOnly = true)
    public AdminOrderDashboardResponse getAdminDashboard(int liveLimit) {
        // Exclude pre-orders — they have their own dashboard
        List<Order> allOrders = orderRepo.findAll(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
                .stream().filter(o -> !o.isPreOrder()).toList();
        AdminOrderDashboardResponse response = new AdminOrderDashboardResponse();
        response.setTotalOrders(allOrders.size());
        response.setPlacedOrders(countByStatus(allOrders, OrderStatus.ORDER_PLACED));
        response.setPreparingOrders(countByStatus(allOrders, OrderStatus.PREPARING));
        response.setReadyOrders(countByStatus(allOrders, OrderStatus.READY));
        response.setLiveOrders(allOrders.stream().filter(this::isLive).count());
        response.setPaidOrders(allOrders.stream().filter(order -> "PAID".equalsIgnoreCase(order.getPaymentStatus())).count());

        LocalDate today = LocalDate.now();
        response.setCompletedToday(allOrders.stream()
                .filter(order -> order.getCompletedAt() != null)
                .filter(order -> today.equals(order.getCompletedAt().toLocalDate()))
                .count());

        List<Long> fulfillmentDurations = allOrders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCompletedAt() != null)
                .filter(order -> today.equals(order.getCompletedAt().toLocalDate()))
                .map(order -> Duration.between(order.getCreatedAt(), order.getCompletedAt()).toMinutes())
                .toList();
        double averageFulfillment = fulfillmentDurations.stream().mapToLong(Long::longValue).average().orElse(0.0);
        response.setAverageFulfillmentMinutes(Math.round(averageFulfillment * 10.0) / 10.0);

        List<AdminOrderResponse> liveOrders = getLiveOrders(liveLimit);
        response.setLiveOrdersQueue(liveOrders);
        response.setDelayedOrders(liveOrders.stream().filter(AdminOrderResponse::isDelayed).count());
        response.setAttentionOrders(liveOrders.stream()
                .filter(order -> order.isDelayed() || order.getStatus() == OrderStatus.READY)
                .limit(6)
                .toList());
        return response;
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse getAdminOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        return buildAdminOrderResponses(List.of(order)).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        AdminOrderUpdateRequest request = new AdminOrderUpdateRequest();
        request.setStatus(status.name());
        updateAdminOrder(orderId, request, "SYSTEM");
    }

    @Transactional
    public AdminOrderResponse updateAdminOrder(Long orderId, AdminOrderUpdateRequest request, String actor) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        boolean hasStatusChange = request != null && request.getStatus() != null && !request.getStatus().isBlank();
        boolean hasNoteChange = request != null && request.getAdminNote() != null;
        if (!hasStatusChange && !hasNoteChange) {
            throw new IllegalArgumentException("Nothing to update for the order");
        }

        String normalizedActor = trimToNull(actor);
        LocalDateTime now = LocalDateTime.now();
        OrderStatus previousStatus = order.getStatus();
        OrderStatus nextStatus = previousStatus;

        if (hasStatusChange) {
            nextStatus = parseStatus(request.getStatus());
            if (!previousStatus.equals(nextStatus)) {
                validateTransition(previousStatus, nextStatus);
                order.setStatus(nextStatus);
                order.setLastStatusChangedAt(now);
                if (nextStatus == OrderStatus.PREPARING && order.getStartedAt() == null) {
                    order.setStartedAt(now);
                }
                if (nextStatus == OrderStatus.READY) {
                    order.setReadyAt(now);
                }
                if (nextStatus == OrderStatus.COMPLETED) {
                    order.setCompletedAt(now);
                }
            }
        }

        if (hasNoteChange) {
            order.setAdminNote(trimToNull(request.getAdminNote()));
        }

        if (normalizedActor != null) {
            order.setAssignedAdmin(normalizedActor);
        }

        orderRepo.save(order);

        if (hasStatusChange && !previousStatus.equals(nextStatus)) {
            recordStatusHistory(order.getId(), previousStatus, nextStatus, trimToNull(request.getAdminNote()), normalizedActor, now);
            if (nextStatus == OrderStatus.READY) {
                //whatsappService.sendOrderReady(order.getPhone(), order.getId());
            }
        }

        return getAdminOrder(orderId);
    }

    @Transactional
    public void markOrderPaidByRazorpayOrderId(String razorpayOrderId) {
        Order order = orderRepo.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow();

        order.setPaymentStatus("PAID");
        order.setPaymentMethod(PaymentMethod.RAZORPAY);
        orderRepo.save(order);

       // whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }

    @Transactional
    public void markOrderPaidByWallet(Long orderId) {
        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(PaymentMethod.WALLET);
        orderRepo.save(order);

       // whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }

    private Specification<Order> matchesQuery(String rawQuery) {
        String normalized = rawQuery.trim().toLowerCase(Locale.ROOT);
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("phone")), "%" + normalized + "%"));
            if (normalized.chars().allMatch(Character::isDigit)) {
                predicates.add(cb.equal(root.get("id"), Long.parseLong(normalized)));
            }
            return cb.or(predicates.toArray(Predicate[]::new));
        };
    }

    private Pageable sanitizePageable(Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return PageRequest.of(0, 10, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        }
        if (pageable.getSort().isSorted()) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    private List<AdminOrderResponse> buildAdminOrderResponses(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return List.of();
        }

        List<Long> orderIds = orders.stream().map(Order::getId).filter(Objects::nonNull).toList();
        List<OrderItem> orderItems = orderIds.isEmpty() ? List.of() : orderItemRepo.findAllByOrderIdIn(orderIds);
        Map<Long, List<OrderItem>> itemsByOrderId = orderItems.stream().collect(Collectors.groupingBy(OrderItem::getOrderId));

        Set<Long> menuIds = orderItems.stream()
                .map(OrderItem::getItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MenuItem> menuById = menuIds.isEmpty() ? Map.of() : menuRepository.findAllById(menuIds).stream()
                .collect(Collectors.toMap(MenuItem::getId, item -> item));

        Map<Long, List<OrderStatusHistory>> historyByOrderId = orderIds.isEmpty()
                ? Map.of()
                : orderStatusHistoryRepository.findAllByOrderIdInOrderByChangedAtDesc(orderIds).stream()
                .collect(Collectors.groupingBy(OrderStatusHistory::getOrderId));

        // Batch-load users for customer name display
        Set<Long> userIds = orders.stream()
                .map(Order::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> userById = userIds.isEmpty() ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        LocalDateTime now = LocalDateTime.now();
        List<AdminOrderResponse> responses = new ArrayList<>();
        for (Order order : orders) {
            responses.add(toAdminOrderResponse(order, itemsByOrderId.getOrDefault(order.getId(), List.of()), menuById, historyByOrderId.getOrDefault(order.getId(), List.of()), now, userById));
        }
        return responses;
    }

    private AdminOrderResponse toAdminOrderResponse(Order order,
                                                    List<OrderItem> orderItems,
                                                    Map<Long, MenuItem> menuById,
                                                    List<OrderStatusHistory> historyEntries,
                                                    LocalDateTime now,
                                                    Map<Long, User> userById) {
        AdminOrderResponse response = new AdminOrderResponse();
        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());
        response.setPhone(order.getPhone());
        response.setUserId(order.getUserId());
        // Resolve customer display name from users table; fall back to phone
        User user = order.getUserId() != null ? userById.get(order.getUserId()) : null;
        response.setUserName(user != null && user.getName() != null ? user.getName() : null);
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setCreatedAt(order.getCreatedAt());
        response.setLastStatusChangedAt(order.getLastStatusChangedAt());
        response.setStartedAt(order.getStartedAt());
        response.setReadyAt(order.getReadyAt());
        response.setCompletedAt(order.getCompletedAt());
        response.setScheduledAt(order.getScheduledAt());
        response.setPreOrder(order.isPreOrder());
        response.setAdminNote(order.getAdminNote());
        response.setAssignedAdmin(order.getAssignedAdmin());
        response.setLive(isLive(order));

        int totalItems = 0;
        double total = 0;
        List<AdminOrderResponse.ItemSummary> itemSummaries = new ArrayList<>();
        for (OrderItem orderItem : orderItems) {
            totalItems += orderItem.getQuantity();
            MenuItem menuItem = menuById.get(orderItem.getItemId());
            AdminOrderResponse.ItemSummary itemSummary = new AdminOrderResponse.ItemSummary();
            itemSummary.setItemId(orderItem.getItemId());
            itemSummary.setQuantity(orderItem.getQuantity());
            if (menuItem != null) {
                itemSummary.setName(menuItem.getName());
                double unitPrice = orderItem.getSellingPriceSnapshot() != null
                        ? orderItem.getSellingPriceSnapshot().doubleValue()
                        : pricingService.getCurrentSellingPrice(menuItem.getId()).doubleValue();
                itemSummary.setPrice(unitPrice);
                itemSummary.setImageUrl(menuItem.getImageUrl());
                itemSummary.setIsVeg(menuItem.getIsVeg());
                double subtotal = unitPrice * orderItem.getQuantity();
                itemSummary.setSubtotal(subtotal);
                total += subtotal;
            }
            itemSummaries.add(itemSummary);
        }
        response.setItems(itemSummaries);
        response.setTotalItems(totalItems);
        response.setTotal(total);

        LocalDateTime createdAt = order.getCreatedAt();
        LocalDateTime stageAnchor = order.getLastStatusChangedAt() != null ? order.getLastStatusChangedAt() : createdAt;
        response.setAgeMinutes(minutesBetween(createdAt, now));
        response.setStageAgeMinutes(minutesBetween(stageAnchor, now));
        response.setDelayed(isDelayed(order, now));
        response.setAvailableTransitions(allowedTransitionsFor(order.getStatus()));

        List<AdminOrderResponse.HistoryEntry> history = historyEntries.stream()
                .limit(8)
                .map(entry -> {
                    AdminOrderResponse.HistoryEntry historyEntry = new AdminOrderResponse.HistoryEntry();
                    historyEntry.setPreviousStatus(entry.getPreviousStatus());
                    historyEntry.setNewStatus(entry.getNewStatus());
                    historyEntry.setChangedBy(entry.getChangedBy());
                    historyEntry.setNote(entry.getNote());
                    historyEntry.setChangedAt(entry.getChangedAt());
                    return historyEntry;
                })
                .toList();
        response.setHistory(history);
        return response;
    }

    // ── Pre-order methods ────────────────────────────────────────────────────

    /**
     * Returns all menu items tagged as PreOrderOnly — these are the only items
     * eligible for pre-orders and must NOT appear in regular orders.
     */
    @Transactional(readOnly = true)
    public List<com.broandbro.qrapp.dto.MenuItemResponse> getPreOrderItems() {
        List<com.broandbro.qrapp.entity.MenuItem> items =
                menuRepository.findVisibleByTagName(PRE_ORDER_ONLY_TAG);
        return items.stream().map(item -> {
            com.broandbro.qrapp.dto.MenuItemResponse r = new com.broandbro.qrapp.dto.MenuItemResponse();
            r.setId(item.getId());
            r.setName(item.getName());
            r.setDescription(item.getDescription());
            r.setImageUrl(item.getImageUrl());
            r.setIsVeg(item.getIsVeg());
            r.setCategory(item.getCategory());
            r.setTag(item.getTag());
            r.setAvailable(item.getAvailable());
            r.setIsHidden(item.getIsHidden());
            try {
                r.setPrice(pricingService.getCurrentSellingPrice(item.getId()));
            } catch (Exception e) {
                r.setPrice(java.math.BigDecimal.ZERO);
            }
            return r;
        }).toList();
    }

    /** Returns the set of item IDs that are tagged PreOrderOnly. */
    private java.util.Set<Long> resolvePreOrderOnlyItemIds(List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) return java.util.Set.of();
        return menuRepository.findAllById(itemIds).stream()
                .filter(m -> m.getTag() != null && PRE_ORDER_ONLY_TAG.equals(m.getTag().getName()))
                .map(com.broandbro.qrapp.entity.MenuItem::getId)
                .collect(java.util.stream.Collectors.toSet());
    }

    /**
     * Creates a pre-order scheduled for a future date/time.
     * Same flow as createOrder, but with PRE_ORDERED status and scheduledAt set.
     */
    @Transactional
    public CreateOrderResult createPreOrder(CreatePreOrderRequest req, User user) {
        log.info("[createPreOrder] Starting — phone={} scheduledAt={} itemCount={}",
                req.getPhone(), req.getScheduledAt(), req.getItems().size());

        // ── Guard: ALL items must be tagged PreOrderOnly ─────────────────────
        List<Long> requestedIds = req.getItems().stream()
                .map(CreatePreOrderRequest.Item::getItemId)
                .toList();
        java.util.Set<Long> preOrderOnlyIds = resolvePreOrderOnlyItemIds(requestedIds);
        log.info("[createPreOrder] PreOrderOnly tag check — requested={} eligible={}", requestedIds, preOrderOnlyIds);

        List<Long> nonPreOrderItems = requestedIds.stream()
                .filter(id -> !preOrderOnlyIds.contains(id))
                .distinct().toList();
        if (!nonPreOrderItems.isEmpty()) {
            log.warn("[createPreOrder] Rejected — items not tagged PreOrderOnly: {}", nonPreOrderItems);
            throw new IllegalArgumentException(
                "Item(s) " + nonPreOrderItems + " are not eligible for pre-orders. " +
                "Only items tagged 'PreOrderOnly' can be pre-ordered.");
        }

        LocalDateTime now = LocalDateTime.now();
        Order order = new Order();
        order.setPhone(user != null ? user.getPhone() : req.getPhone());
        order.setUserId(user != null ? user.getId() : null);
        order.setStatus(OrderStatus.PRE_ORDERED);
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY);
        order.setCreatedAt(now);
        order.setLastStatusChangedAt(now);
        order.setPriority(OrderPriority.NORMAL);
        order.setPreOrder(true);
        order.setScheduledAt(req.getScheduledAt());
        if (req.getCustomerNote() != null && !req.getCustomerNote().isBlank()) {
            order.setAdminNote(req.getCustomerNote());
        }

        String orderNumber = orderNumberGenerator.generateOrderNumber(now.toLocalDate());
        order.setOrderNumber(orderNumber);
        log.info("[createPreOrder] Order number generated: {}", orderNumber);

        List<Object[]> itemSnaps = new java.util.ArrayList<>();
        java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

        // Build item list converting from CreatePreOrderRequest items
        List<CreateOrderRequest.Item> orderItems = req.getItems().stream().map(i -> {
            CreateOrderRequest.Item item = new CreateOrderRequest.Item();
            item.setItemId(i.getItemId());
            item.setQuantity(i.getQuantity());
            return item;
        }).toList();

        for (CreateOrderRequest.Item i : orderItems) {
            log.info("[createPreOrder] Looking up menuItem id={}", i.getItemId());
            MenuItem menuItem = menuRepository.findById(i.getItemId())
                    .orElseThrow(() -> new RuntimeException("MenuItem not found: " + i.getItemId()));
            Long shopId = menuItem.getShop() != null ? menuItem.getShop().getId() : null;
            log.info("[createPreOrder] MenuItem found — id={} name='{}' shopId={}", menuItem.getId(), menuItem.getName(), shopId);

            PricingService.OrderItemSnapshot snap = pricingService.createSnapshot(i.getItemId(), shopId, i.getQuantity());
            log.info("[createPreOrder] Snapshot — itemId={} qty={} sellingPrice={} lineTotal={}",
                    i.getItemId(), i.getQuantity(), snap.sellingPriceSnapshot(), snap.lineTotal());

            if (snap.sellingPriceSnapshot() == null || snap.sellingPriceSnapshot().compareTo(java.math.BigDecimal.ZERO) == 0) {
                log.warn("[createPreOrder] WARNING — itemId={} has ZERO selling price. Razorpay will reject amount=0.", i.getItemId());
            }

            itemSnaps.add(new Object[]{i, snap});
            subtotal = subtotal.add(snap.lineTotal() != null ? snap.lineTotal() : java.math.BigDecimal.ZERO);
        }

        log.info("[createPreOrder] Subtotal after items: {}", subtotal);

        java.math.BigDecimal couponDiscount = java.math.BigDecimal.ZERO;

        // Build temp CreateOrderRequest for promotion resolution
        if (req.getPromotionCode() != null && !req.getPromotionCode().isBlank() && user != null) {
            CreateOrderRequest tempReq = new CreateOrderRequest();
            tempReq.setPhone(req.getPhone());
            tempReq.setPaymentMethod(req.getPaymentMethod());
            tempReq.setItems(orderItems);
            tempReq.setPromotionCode(req.getPromotionCode());
            couponDiscount = resolvePromotionDiscount(tempReq, user, subtotal, couponDiscount);
            if (couponDiscount.compareTo(java.math.BigDecimal.ZERO) > 0) {
                order.setCouponCode(req.getPromotionCode().toUpperCase());
                order.setCouponDiscount(couponDiscount);
                log.info("[createPreOrder] Coupon applied — code={} discount={}", req.getPromotionCode(), couponDiscount);
            }
        }

        order.setSubtotal(subtotal);
        order.setTax(java.math.BigDecimal.ZERO);
        order.setGrandTotal(subtotal.subtract(couponDiscount));
        log.info("[createPreOrder] Totals — subtotal={} couponDiscount={} grandTotal={}",
                subtotal, couponDiscount, order.getGrandTotal());

        log.info("[createPreOrder] Saving order ...");
        order = orderRepo.save(order);
        log.info("[createPreOrder] Order saved — id={}", order.getId());

        recordStatusHistory(order.getId(), null, OrderStatus.PRE_ORDERED, "Pre-order created for " + req.getScheduledAt(), "SYSTEM", now);

        for (Object[] pair : itemSnaps) {
            CreateOrderRequest.Item i = (CreateOrderRequest.Item) pair[0];
            PricingService.OrderItemSnapshot snap = (PricingService.OrderItemSnapshot) pair[1];
            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setItemId(i.getItemId());
            oi.setQuantity(i.getQuantity());
            oi.setSellingPriceSnapshot(snap.sellingPriceSnapshot());
            oi.setCostPriceSnapshot(snap.costPriceSnapshot());
            oi.setProfitSnapshot(snap.profitSnapshot());
            oi.setLineTotal(snap.lineTotal());
            orderItemRepo.save(oi);
            log.info("[createPreOrder] OrderItem saved — orderId={} itemId={} qty={} lineTotal={}",
                    order.getId(), i.getItemId(), i.getQuantity(), snap.lineTotal());
        }

        log.info("[createPreOrder] Completed — orderId={} orderNumber={}", order.getId(), order.getOrderNumber());
        return new CreateOrderResult(order, java.util.List.of());
    }

    /**
     * Returns all pre-orders with optional date-range filtering.
     */
    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> getAdminPreOrders(
            Optional<String> status,
            Optional<String> query,
            Optional<LocalDateTime> scheduledFrom,
            Optional<LocalDateTime> scheduledTo,
            Pageable pageable) {

        Specification<Order> spec = (root, cq, cb) -> cb.isTrue(root.get("preOrder"));

        if (status.isPresent() && !status.get().isBlank()) {
            OrderStatus parsedStatus = parseStatus(status.get());
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), parsedStatus));
        }

        if (scheduledFrom.isPresent()) {
            LocalDateTime from = scheduledFrom.get();
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("scheduledAt"), from));
        }

        if (scheduledTo.isPresent()) {
            LocalDateTime to = scheduledTo.get();
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("scheduledAt"), to));
        }

        if (query.isPresent() && !query.get().isBlank()) {
            spec = spec.and(matchesQuery(query.get()));
        }

        Pageable effectivePageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Order.asc("scheduledAt"), Sort.Order.desc("createdAt")));
        Page<Order> page = orderRepo.findAll(spec, effectivePageable);
        List<AdminOrderResponse> content = buildAdminOrderResponses(page.getContent());
        return new PageImpl<>(content, effectivePageable, page.getTotalElements());
    }

    /**
     * Returns dashboard stats for the pre-order management panel.
     */
    @Transactional(readOnly = true)
    public AdminPreOrderDashboardResponse getAdminPreOrderDashboard(int upcomingLimit) {
        Specification<Order> preOrderSpec = (root, cq, cb) -> cb.isTrue(root.get("preOrder"));
        List<Order> allPreOrders = orderRepo.findAll(preOrderSpec, Sort.by(Sort.Order.asc("scheduledAt")));

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        AdminPreOrderDashboardResponse response = new AdminPreOrderDashboardResponse();
        response.setTotalPreOrders(allPreOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED).count());
        response.setTodayPreOrders(allPreOrders.stream()
                .filter(o -> o.getScheduledAt() != null && today.equals(o.getScheduledAt().toLocalDate()))
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED).count());
        response.setTomorrowPreOrders(allPreOrders.stream()
                .filter(o -> o.getScheduledAt() != null && tomorrow.equals(o.getScheduledAt().toLocalDate()))
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED).count());
        response.setPendingPreOrders(allPreOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PRE_ORDERED).count());
        response.setAcceptedPreOrders(allPreOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.PRE_ORDERED && o.getStatus() != OrderStatus.CANCELLED).count());
        response.setCancelledPreOrders(allPreOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED).count());
        response.setOverduePreOrders(allPreOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PRE_ORDERED)
                .filter(o -> o.getScheduledAt() != null && o.getScheduledAt().isBefore(now))
                .count());

        List<Order> upcoming = allPreOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PRE_ORDERED)
                .filter(o -> o.getScheduledAt() != null)
                .sorted(Comparator.comparing(Order::getScheduledAt))
                .limit(upcomingLimit)
                .toList();
        response.setUpcomingQueue(buildAdminOrderResponses(upcoming));
        return response;
    }

    /**
     * Accepts a pre-order — transitions PRE_ORDERED → ORDER_PLACED.
     */
    @Transactional
    public AdminOrderResponse acceptPreOrder(Long orderId, String adminNote, String actor) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Pre-order not found: " + orderId));
        if (order.getStatus() != OrderStatus.PRE_ORDERED) {
            throw new IllegalStateException("Order " + orderId + " is not in PRE_ORDERED status");
        }
        LocalDateTime now = LocalDateTime.now();
        order.setStatus(OrderStatus.ORDER_PLACED);
        order.setLastStatusChangedAt(now);
        if (adminNote != null && !adminNote.isBlank()) {
            order.setAdminNote(adminNote);
        }
        if (actor != null) order.setAssignedAdmin(actor);
        orderRepo.save(order);
        recordStatusHistory(order.getId(), OrderStatus.PRE_ORDERED, OrderStatus.ORDER_PLACED,
                adminNote, actor, now);
        return getAdminOrder(orderId);
    }

    private void validateTransition(OrderStatus currentStatus, OrderStatus nextStatus) {
        List<OrderStatus> allowed = allowedTransitionsFor(currentStatus);
        if (!allowed.contains(nextStatus)) {
            throw new IllegalArgumentException("Cannot move order from " + currentStatus + " to " + nextStatus);
        }
    }

    private List<OrderStatus> allowedTransitionsFor(OrderStatus status) {
        if (status == null) {
            return List.of();
        }
        return switch (status) {
            case PRE_ORDERED -> List.of(OrderStatus.ORDER_PLACED, OrderStatus.CANCELLED);
            case ORDER_PLACED -> List.of(OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case ACKNOWLEDGED -> List.of();
            case PREPARING -> List.of(OrderStatus.ORDER_PLACED, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case READY -> List.of(OrderStatus.PREPARING, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case DELIVERED -> List.of();
            case COMPLETED, CANCELLED -> List.of();
        };
    }

    private boolean isLive(Order order) {
        return order != null && order.getStatus() != null && LIVE_STATUSES.contains(order.getStatus());
    }

    private boolean isDelayed(Order order, LocalDateTime now) {
        if (!isLive(order)) {
            return false;
        }
        long stageAge = minutesBetween(order.getLastStatusChangedAt() != null ? order.getLastStatusChangedAt() : order.getCreatedAt(), now);
        return switch (order.getStatus()) {
            case ORDER_PLACED -> stageAge >= 5;
            case PREPARING -> stageAge >= 15;
            case READY -> stageAge >= 10;
            default -> false;
        };
    }

    private long countByStatus(Collection<Order> orders, OrderStatus status) {
        return orders.stream().filter(order -> status == order.getStatus()).count();
    }

    private long minutesBetween(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return 0L;
        }
        return Math.max(0L, Duration.between(start, end).toMinutes());
    }

    private OrderStatus parseStatus(String rawStatus) {
        try {
            return OrderStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported order status: " + rawStatus);
        }
    }


    private void recordStatusHistory(Long orderId,
                                     OrderStatus previousStatus,
                                     OrderStatus newStatus,
                                     String note,
                                     String changedBy,
                                     LocalDateTime changedAt) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(orderId);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setNote(note);
        history.setChangedBy(changedBy);
        history.setChangedAt(changedAt != null ? changedAt : LocalDateTime.now());
        orderStatusHistoryRepository.save(history);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Validates and computes the discount for a promotion code.
     * Returns ZERO if the promotion is not found or fails eligibility.
     * Logs a warning rather than throwing — order creation must not fail due to a bad promo code.
     */
    private java.math.BigDecimal resolvePromotionDiscount(
            CreateOrderRequest req, User user, java.math.BigDecimal subtotal,
            java.math.BigDecimal fallback) {
        try {
            Promotion promotion = promotionRepository
                    .findByCode(req.getPromotionCode().toUpperCase())
                    .orElse(null);
            if (promotion == null) {
                log.warn("Promotion not found at order creation: {}", req.getPromotionCode());
                return fallback;
            }

            int orderCount = (int) orderRepo.countByUserId(user.getId());
            java.time.LocalDateTime lastOrderAt = orderRepo.findLastOrderAtByUserId(user.getId()).orElse(null);
            UserContext userCtx = new UserContext(user.getId(), orderCount, lastOrderAt);

            List<CartItemContext> items = req.getItems().stream()
                    .map(i -> {
                        try {
                            com.broandbro.qrapp.entity.MenuItem mi = menuRepository.findById(i.getItemId()).orElse(null);
                            Long catId = (mi != null && mi.getCategory() != null) ? mi.getCategory().getId() : null;
                            java.math.BigDecimal price = (mi != null)
                                    ? pricingService.getCurrentSellingPrice(mi.getId())
                                    : java.math.BigDecimal.ZERO;
                            return new CartItemContext(i.getItemId(), catId, i.getQuantity(), price);
                        } catch (Exception e) {
                            return new CartItemContext(i.getItemId(), null, i.getQuantity(), java.math.BigDecimal.ZERO);
                        }
                    }).toList();

            Long restaurantId = items.stream()
                    .findFirst()
                    .map(CartItemContext::menuItemId)
                    .map(id -> {
                        try {
                            var mi = menuRepository.findById(id).orElse(null);
                            return (mi != null && mi.getShop() != null) ? mi.getShop().getId() : null;
                        } catch (Exception e) { return null; }
                    }).orElse(null);

            CartContext cartCtx = new CartContext(restaurantId, subtotal, java.math.BigDecimal.ZERO, items);
            EligibilityContext ctx = new EligibilityContext(userCtx, cartCtx, java.time.LocalDateTime.now());

            EligibilityResult result = promotionRuleEngine.evaluate(ctx, promotion);
            if (!result.eligible()) {
                log.warn("Promotion {} ineligible at order creation: {}", req.getPromotionCode(), result.failureReason());
                return fallback;
            }
            return result.discount() != null ? result.discount() : fallback;
        } catch (Exception e) {
            log.error("Error resolving promotion discount for code: {}", req.getPromotionCode(), e);
            return fallback;
        }
    }

    private void recordPromotionUsage(String code, User user, Order order,
                                      java.math.BigDecimal discount, java.math.BigDecimal subtotal) {
        try {
            promotionRepository.findByCode(code.toUpperCase()).ifPresent(promotion -> {
                PromotionUsage usage = PromotionUsage.builder()
                        .promotionId(promotion.getId())
                        .userId(user.getId())
                        .orderId(order.getId())
                        .promotionCode(code.toUpperCase())
                        .discountAmount(discount)
                        .orderSubtotal(subtotal)
                        .build();
                promotionUsageRepository.save(usage);
            });
        } catch (Exception e) {
            log.error("Failed to record promotion usage for code: {} order: {}", code, order.getId(), e);
        }
    }
}

