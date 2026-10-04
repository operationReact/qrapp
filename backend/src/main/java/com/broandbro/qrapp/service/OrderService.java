package com.broandbro.qrapp.service;

import com.broandbro.qrapp.exception.OrderValidationException;
import com.broandbro.qrapp.dto.AdminOrderDashboardResponse;
import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.dto.AdminPreOrderDashboardResponse;
import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.Location;
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
import com.broandbro.qrapp.combo.service.ComboCampaignService;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRuleEngine;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.entity.PromotionUsage;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.promotion.repository.PromotionUsageRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.OrderStatusHistoryRepository;
import com.broandbro.qrapp.repository.PaymentEventRepository;
import com.broandbro.qrapp.entity.PaymentEvent;
import com.broandbro.qrapp.time.BusinessTime;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private static final Collection<PaymentMethod> COD_PAYMENT_METHODS = List.of(PaymentMethod.PAY_AT_STALL, PaymentMethod.WALLET);
    private static final String PRE_ORDER_ONLY_TAG = "PreOrderOnly";

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuRepository menuRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final PricingService pricingService;
    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository promotionUsageRepository;
    private final PromotionRuleEngine promotionRuleEngine;
    private final MilestoneCouponService milestoneCouponService;
    private final com.broandbro.qrapp.repository.UserRepository userRepository;
    private final ComboCampaignService comboCampaignService;
    private final LocationAccessService locationAccessService;
    private final com.broandbro.qrapp.repository.LocationRepository locationRepository;
    private final InvoiceService invoiceService;
    private final TaxCalculationService taxCalculationService;

    /**
     * Creates a new order with a human-readable, location-specific order number.
     *
     * Flow:
     * 1. Validate items and resolve order location
     * 2. Validate location has a location code
     * 3. Generate location-specific order number using pessimistic locking
     * 4. Create and persist order with immutable location code
     * 5. Persist order items
     *
     * Thread-safe order number generation happens inside this transaction.
     *
     * @param req the order creation request
     * @param user the user placing the order (optional)
     * @return the created order with location-specific order_number
     * @throws OrderValidationException if location has no location code
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

        // ── Validate location (if provided by frontend) ───────────────────────
        Location requestedLocation = null;
        if (req.getLocationId() != null) {
            requestedLocation = locationRepository.findById(req.getLocationId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found: " + req.getLocationId()));
            
            // If user is provided, validate they have access to this location
            if (user != null) {
                locationAccessService.requireLocationAccess(user, req.getLocationId());
            }
            log.info("[createOrder] Location provided by frontend: id={}, name={}", 
                requestedLocation.getId(), requestedLocation.getName());
        }

        LocalDateTime now = BusinessTime.now();
        Order order = new Order();
        order.setPhone(user != null ? user.getPhone() : req.getPhone());
        order.setUserId(user != null ? user.getId() : null);
        order.setStatus(OrderStatus.ORDER_PLACED);
        // CRITICAL: Payment status is PENDING at order creation.
        // Order will NOT appear in Kitchen Queue until paymentStatus = PAID (or WALLET/PAY_AT_STALL with PENDING).
        // This is enforced by OrderService.getLiveOrders() which calls findKitchenEligibleOrdersByStatusIn...
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY);
        order.setCreatedAt(now);
        order.setLastStatusChangedAt(now);
        order.setPriority(OrderPriority.NORMAL);

        // ── Step 1a: pre-compute all item snapshots BEFORE any DB save ──────────
        // Build (item, snapshot) pairs so we can sum up totals first
        List<Object[]> itemSnaps = new java.util.ArrayList<>(); // [CreateOrderRequest.Item, OrderItemSnapshot]
        java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

        for (CreateOrderRequest.Item i : req.getItems()) {
            MenuItem menuItem = menuRepository.findById(i.getItemId())
                    .orElseThrow(() -> new RuntimeException("MenuItem not found: " + i.getItemId()));
            
            // ── Validate menu item belongs to requested location (if provided) ───
            if (requestedLocation != null && menuItem.getLocation() != null) {
                if (!requestedLocation.getId().equals(menuItem.getLocation().getId())) {
                    throw new IllegalArgumentException(
                        "Menu item '" + menuItem.getName() + "' does not belong to location '" + 
                        requestedLocation.getName() + "'. Cannot add items from different locations to same order.");
                }
            }
            
            // Scope the order to the location of its items (menu is location-owned).
            if (order.getLocation() == null && menuItem.getLocation() != null) {
                order.setLocation(menuItem.getLocation());
            }
            Long vendorId = menuItem.getVendor() != null ? menuItem.getVendor().getId() : null;
            PricingService.OrderItemSnapshot snap = pricingService.createSnapshot(i.getItemId(), vendorId, i.getQuantity());
            itemSnaps.add(new Object[]{i, snap});
            subtotal = subtotal.add(snap.lineTotal());
        }

        // ── Validate all items come from the same location ──────────────────────
        // Extract the location from the first menu item (after all items are loaded)
        // and verify consistency
        if (order.getLocation() == null) {
            MenuItem firstItem = menuRepository.findById(req.getItems().get(0).getItemId())
                    .orElseThrow(() -> new RuntimeException("MenuItem not found"));
            order.setLocation(firstItem.getLocation());
        }
        
        // If frontend provided a location, it must match the order's resolved location
        if (requestedLocation != null && order.getLocation() != null) {
            if (!requestedLocation.getId().equals(order.getLocation().getId())) {
                throw new IllegalArgumentException(
                    "Order location mismatch: requested=" + requestedLocation.getId() + 
                    " but items belong to location=" + order.getLocation().getId());
            }
        }

        // ── Step 1b: validate location and extract location code ─────────────────
        // Every order must have a location before we generate the order number
        log.info("[createOrder] DEBUG: order.getLocation()={}", order.getLocation());
        if (order.getLocation() == null) {
            log.error("[createOrder] REJECT: Order has no location");
            throw new OrderValidationException("LOCATION_REQUIRED", "Order must have a location");
        }
        
        Location resolvedLocation = order.getLocation();
        log.info("[createOrder] DEBUG: Location resolved - id={}, name={}, code={}", 
            resolvedLocation.getId(), resolvedLocation.getName(), resolvedLocation.getCode());
        
        String locationCode = resolvedLocation.getCode();
        log.info("[createOrder] DEBUG: Extracted locationCode={}", locationCode);
        
        if (locationCode == null || locationCode.isBlank()) {
            log.error("[createOrder] REJECT: Location has no code. Location id={} name='{}'", 
                resolvedLocation.getId(), resolvedLocation.getName());
            throw new OrderValidationException(
                "LOCATION_CODE_MISSING",
                "Location '" + resolvedLocation.getName() + "' has no location code. " +
                "Location code is required to generate the order number."
            );
        }

        // ── Step 1c: Generate location-specific order number with pessimistic locking
        log.info("[createOrder] DEBUG: About to generateOrderNumber with locationCode={}, date={}", 
            locationCode, now.toLocalDate());
        String orderNumber = orderNumberGenerator.generateOrderNumber(locationCode, now.toLocalDate());
        log.info("[createOrder] DEBUG: Generated orderNumber={}", orderNumber);
        
        order.setOrderNumber(orderNumber);
        order.setLocationCode(locationCode); // Store immutable location code snapshot
        log.info("[createOrder] DEBUG: Set order.orderNumber={}, order.locationCode={}", 
            order.getOrderNumber(), order.getLocationCode());

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

        // Apply BYOC combo discount if no promotion code was used
        if (couponDiscount.compareTo(java.math.BigDecimal.ZERO) == 0
                && req.getByocCampaignId() != null) {
            java.util.List<com.broandbro.qrapp.promotion.engine.CartItemContext> cartItems =
                    new java.util.ArrayList<>();
            for (CreateOrderRequest.Item i : req.getItems()) {
                MenuItem mi = menuRepository.findById(i.getItemId()).orElse(null);
                Long catId = (mi != null && mi.getCategory() != null) ? mi.getCategory().getId() : null;
                java.math.BigDecimal unitPrice = pricingService.getCurrentSellingPrice(i.getItemId());
                cartItems.add(new com.broandbro.qrapp.promotion.engine.CartItemContext(
                        i.getItemId(), catId, i.getQuantity(), unitPrice));
            }
            com.broandbro.qrapp.promotion.engine.CartContext byocCart =
                    new com.broandbro.qrapp.promotion.engine.CartContext(null, subtotal, java.math.BigDecimal.ZERO, cartItems);
            try {
                com.broandbro.qrapp.combo.dto.campaign.ComboCartEvaluationResponse evalResp =
                        comboCampaignService.evaluateCart(byocCart);
                if (evalResp.bestDiscountAmount() != null
                        && evalResp.bestDiscountAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    couponDiscount = evalResp.bestDiscountAmount();
                    order.setCouponCode("BYOC_" + req.getByocCampaignId());
                    order.setCouponDiscount(couponDiscount);
                    log.info("BYOC discount ₹{} applied from campaign {} on order {}",
                            couponDiscount, req.getByocCampaignId(), orderNumber);
                }
            } catch (Exception ex) {
                log.warn("BYOC evaluation failed (non-fatal): {}", ex.getMessage());
            }
        }
        List<TaxCalculationService.TaxCalculationResult> adjustedTaxes =
                calculateDiscountedTaxes(itemSnaps, couponDiscount);
        java.math.BigDecimal tax = itemSnaps.stream()
                .map(pair -> adjustedTaxes.get(itemSnaps.indexOf(pair)).totalTax())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        for (int index = 0; index < itemSnaps.size(); index++) {
            Object[] pair = itemSnaps.get(index);
            itemSnaps.set(index, new Object[]{pair[0], pair[1], adjustedTaxes.get(index)});
        }
        BigDecimal baseSubtotal = itemSnaps.stream()
                .map(pair -> ((PricingService.OrderItemSnapshot) pair[1]).lineTotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setSubtotal(baseSubtotal);
        order.setTax(MoneyService.amount(tax));
        order.setGrandTotal(MoneyService.amount(baseSubtotal.subtract(couponDiscount).add(tax)));

        // ── Step 3: single save — order persisted with correct totals + gets ID ─
        log.info("[createOrder] DEBUG: Before orderRepo.save() - orderNumber={}, locationCode={}, locationId={}", 
            order.getOrderNumber(), order.getLocationCode(), order.getLocation() != null ? order.getLocation().getId() : null);
        
        order = orderRepo.save(order);
        
        log.info("[createOrder] DEBUG: After orderRepo.save() - orderId={}, orderNumber={}, locationCode={}", 
            order.getId(), order.getOrderNumber(), order.getLocationCode());
        
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
            TaxCalculationService.TaxCalculationResult adjustedTax =
                    (TaxCalculationService.TaxCalculationResult) pair[2];
            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setItemId(i.getItemId());
            oi.setQuantity(i.getQuantity());
            oi.setSellingPriceSnapshot(snap.sellingPriceSnapshot());
            oi.setCostPriceSnapshot(snap.costPriceSnapshot());
            oi.setProfitSnapshot(snap.profitSnapshot());
            oi.setLineTotal(adjustedTax.totalAmount());
            applyTaxSnapshot(oi, snap, adjustedTax,
                    snap.lineTotal().subtract(adjustedTax.taxableAmount()));
            orderItemRepo.save(oi);
        }
        invoiceService.createIfAbsent(order);

        return new CreateOrderResult(order, awardedCoupons);
    }

    private void applyTaxSnapshot(OrderItem item, PricingService.OrderItemSnapshot snapshot,
                                  TaxCalculationService.TaxCalculationResult tax,
                                  BigDecimal discountAmount) {
        item.setUnitBasePrice(snapshot.sellingPriceSnapshot());
        item.setGrossBaseAmount(snapshot.lineTotal());
        item.setDiscountAmount(MoneyService.amount(discountAmount));
        item.setTaxableAmount(tax.taxableAmount());
        item.setGstRate(tax.gstRate());
        item.setCgstRate(tax.cgstRate());
        item.setCgstAmount(tax.cgstAmount());
        item.setSgstRate(tax.sgstRate());
        item.setSgstAmount(tax.sgstAmount());
        item.setIgstRate(tax.igstRate());
        item.setIgstAmount(tax.igstAmount());
        item.setTotalTax(tax.totalTax());
        item.setUnitCustomerPrice(MoneyService.amount(tax.totalAmount()
                .divide(BigDecimal.valueOf(Math.max(1, item.getQuantity())), 8, MoneyService.ROUNDING)));
        item.setTotalCustomerPrice(tax.totalAmount());
        item.setTaxProfileId(snapshot.taxProfileId());
        item.setHsnSac(snapshot.hsnSac());
    }

    private List<TaxCalculationService.TaxCalculationResult> calculateDiscountedTaxes(
            List<Object[]> itemSnaps, BigDecimal discount) {
        BigDecimal totalBase = itemSnaps.stream()
                .map(pair -> ((PricingService.OrderItemSnapshot) pair[1]).lineTotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingDiscount = MoneyService.amount(discount);
        List<TaxCalculationService.TaxCalculationResult> results = new ArrayList<>();
        for (int index = 0; index < itemSnaps.size(); index++) {
            PricingService.OrderItemSnapshot snapshot =
                    (PricingService.OrderItemSnapshot) itemSnaps.get(index)[1];
            BigDecimal share = index == itemSnaps.size() - 1 || totalBase.signum() == 0
                    ? remainingDiscount
                    : MoneyService.amount(discount.multiply(snapshot.lineTotal())
                    .divide(totalBase, 8, MoneyService.ROUNDING));
            remainingDiscount = remainingDiscount.subtract(share);
            BigDecimal discountedBase = snapshot.lineTotal().subtract(share).max(BigDecimal.ZERO);
            results.add(pricingService.calculateDiscountedTax(snapshot, discountedBase));
        }
        return results;
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
            summary.setInvoiceAvailable(order.getId() != null && order.getGrandTotal() != null);

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
                    double unitPrice = orderItem.getUnitCustomerPrice() != null
                            ? orderItem.getUnitCustomerPrice().doubleValue()
                            : orderItem.getSellingPriceSnapshot() != null
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
            summary.setTotal(order.getGrandTotal() != null ? order.getGrandTotal().doubleValue() : total);
            response.add(summary);
        }

        return response;
    }

    /**
     * Converts the final persisted order total to Razorpay's smallest currency
     * unit. The caller must provide the already-discounted grand total.
     */
    public int calculateAmountForOrder(BigDecimal grandTotal) {
        if (grandTotal == null || grandTotal.compareTo(BigDecimal.ZERO) <= 0) return 0;
        return grandTotal.setScale(2, RoundingMode.HALF_UP)
                .movePointRight(2)
                .intValueExact();
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> getAdminOrders(Optional<String> status,
                                                   Optional<String> paymentStatus,
                                                   Optional<String> query,
                                                   boolean liveOnly,
                                                   Optional<List<Long>> locationScope,
                                                   Pageable pageable) {
        // Pre-orders are managed exclusively via /admin/pre-orders — exclude them here
        Specification<Order> specification = (root, cq, cb) -> cb.isFalse(root.get("preOrder"));

        Specification<Order> locationSpec = locationScopeSpec(locationScope);
        if (locationSpec != null) {
            specification = specification.and(locationSpec);
        }

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
    public List<AdminOrderResponse> getLiveOrders(int limit, Optional<List<Long>> locationScope) {
        int safeLimit = Math.max(1, Math.min(30, limit));
        // Explicitly exclude pre-orders — they are managed via the pre-orders admin page only
        // CRITICAL: Only kitchen-eligible orders (PAID or PAY_AT_STALL/WALLET with PENDING status)
        if (locationScope.isEmpty()) {
            return buildAdminOrderResponses(
                    orderRepo.findKitchenEligibleOrdersByStatusInOrderByCreatedAtAscIdAsc(
                            LIVE_STATUSES, COD_PAYMENT_METHODS, PageRequest.of(0, safeLimit)));
        }
        List<Long> ids = locationScope.get();
        if (ids.isEmpty()) {
            return List.of();
        }
        return buildAdminOrderResponses(
                orderRepo.findKitchenEligibleOrdersByStatusInAndLocationIdInOrderByCreatedAtAscIdAsc(
                        LIVE_STATUSES, ids, COD_PAYMENT_METHODS, PageRequest.of(0, safeLimit)));
    }

    @Transactional(readOnly = true)
    public AdminOrderDashboardResponse getAdminDashboard(int liveLimit, Optional<List<Long>> locationScope) {
        // Exclude pre-orders — they have their own dashboard
        AdminOrderDashboardResponse response = new AdminOrderDashboardResponse();

        // A scoped user with no accessible locations sees an empty dashboard.
        if (locationScope.isPresent() && locationScope.get().isEmpty()) {
            response.setLiveOrdersQueue(List.of());
            response.setAttentionOrders(List.of());
            return response;
        }

        List<Long> ids = locationScope.orElse(null);

        response.setTotalOrders(ids == null
                ? orderRepo.countByPreOrderFalse()
                : orderRepo.countByPreOrderFalseAndLocationIdIn(ids));
        response.setPlacedOrders(ids == null
                ? orderRepo.countByStatusAndPreOrderFalse(OrderStatus.ORDER_PLACED)
                : orderRepo.countByStatusAndPreOrderFalseAndLocationIdIn(OrderStatus.ORDER_PLACED, ids));
        response.setPreparingOrders(ids == null
                ? orderRepo.countByStatusAndPreOrderFalse(OrderStatus.PREPARING)
                : orderRepo.countByStatusAndPreOrderFalseAndLocationIdIn(OrderStatus.PREPARING, ids));
        response.setReadyOrders(ids == null
                ? orderRepo.countByStatusAndPreOrderFalse(OrderStatus.READY)
                : orderRepo.countByStatusAndPreOrderFalseAndLocationIdIn(OrderStatus.READY, ids));
        response.setLiveOrders(ids == null
                ? orderRepo.countByStatusInAndPreOrderFalse(LIVE_STATUSES)
                : orderRepo.countByStatusInAndPreOrderFalseAndLocationIdIn(LIVE_STATUSES, ids));
        response.setPaidOrders(ids == null
                ? orderRepo.countByPaymentStatusIgnoreCaseAndPreOrderFalse("PAID")
                : orderRepo.countByPaymentStatusIgnoreCaseAndPreOrderFalseAndLocationIdIn("PAID", ids));

        LocalDate today = BusinessTime.today();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();
        response.setCompletedToday(ids == null
                ? orderRepo.countByCompletedAtGreaterThanEqualAndCompletedAtLessThanAndPreOrderFalse(todayStart, tomorrowStart)
                : orderRepo.countByCompletedAtGreaterThanEqualAndCompletedAtLessThanAndPreOrderFalseAndLocationIdIn(todayStart, tomorrowStart, ids));

        double averageFulfillment = Optional.ofNullable(ids == null
                        ? orderRepo.averageFulfillmentMinutes(todayStart, tomorrowStart)
                        : orderRepo.averageFulfillmentMinutesForLocations(todayStart, tomorrowStart, ids))
                .orElse(0.0);
        response.setAverageFulfillmentMinutes(Math.round(averageFulfillment * 10.0) / 10.0);

        List<AdminOrderResponse> liveOrders = getLiveOrders(liveLimit, locationScope);
        response.setLiveOrdersQueue(liveOrders);
        response.setDelayedOrders(ids == null
                ? orderRepo.countDelayedLiveOrders()
                : orderRepo.countDelayedLiveOrdersForLocations(ids));
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

    /**
     * Ensures the given order belongs to a location the caller is allowed to see.
     * A no-op for SUPER_ADMIN "All Locations" scope (empty Optional).
     */
    @Transactional(readOnly = true)
    public void assertOrderWithinScope(Long orderId, Optional<List<Long>> locationScope) {
        if (locationScope == null || locationScope.isEmpty()) {
            return;
        }
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        assertOrderWithinScope(order, locationScope);
    }

    private void assertOrderWithinScope(Order order, Optional<List<Long>> locationScope) {
        if (locationScope == null || locationScope.isEmpty()) {
            return;
        }
        List<Long> ids = locationScope.get();
        Long locationId = order.getLocation() != null ? order.getLocation().getId() : null;
        if (locationId == null || !ids.contains(locationId)) {
            throw new AccessDeniedException("location_access_denied");
        }
    }

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        AdminOrderUpdateRequest request = new AdminOrderUpdateRequest();
        request.setStatus(status.name());
        updateAdminOrder(orderId, request, "SYSTEM");
    }

    @Transactional
    public AdminOrderResponse updateAdminOrder(Long orderId, AdminOrderUpdateRequest request, String actor) {
        return updateAdminOrder(orderId, request, actor, Optional.empty());
    }

    @Transactional
    public AdminOrderResponse updateAdminOrder(Long orderId,
                                               AdminOrderUpdateRequest request,
                                               String actor,
                                               Optional<List<Long>> locationScope) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        assertOrderWithinScope(order, locationScope);

        boolean hasStatusChange = request != null && request.getStatus() != null && !request.getStatus().isBlank();
        boolean hasNoteChange = request != null && request.getAdminNote() != null;
        boolean hasPaymentStatusChange = request != null && request.getPaymentStatus() != null && !request.getPaymentStatus().isBlank();
        if (!hasStatusChange && !hasNoteChange && !hasPaymentStatusChange) {
            throw new IllegalArgumentException("Nothing to update for the order");
        }

        String normalizedActor = trimToNull(actor);
        LocalDateTime now = BusinessTime.now();
        OrderStatus previousStatus = order.getStatus();
        OrderStatus nextStatus = previousStatus;
        String previousPaymentStatus = order.getPaymentStatus();
        String nextPaymentStatus = previousPaymentStatus;

        if (hasStatusChange) {
            nextStatus = parseStatus(request.getStatus());
            if (!previousStatus.equals(nextStatus)) {
                // Pass reason for transition validation (required for corrective transitions)
                validateTransition(previousStatus, nextStatus, order, trimToNull(request.getReason()));
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

        if (hasPaymentStatusChange) {
            String normalized = request.getPaymentStatus().trim().toUpperCase();
            if (!normalized.equals("PAID") && !normalized.equals("PENDING") && !normalized.equals("FAILED")) {
                throw new IllegalArgumentException("Invalid paymentStatus: " + request.getPaymentStatus());
            }
            nextPaymentStatus = normalized;
            order.setPaymentStatus(normalized);
        }

        if (hasNoteChange) {
            order.setAdminNote(trimToNull(request.getAdminNote()));
        }

        if (normalizedActor != null) {
            order.setAssignedAdmin(normalizedActor);
        }

        orderRepo.save(order);

        if (hasStatusChange && !previousStatus.equals(nextStatus)) {
            recordStatusHistory(order.getId(), previousStatus, nextStatus, trimToNull(request.getAdminNote()), 
                    normalizedActor, now, trimToNull(request.getReason()), null, "STATUS_CHANGE");
            if (nextStatus == OrderStatus.READY) {
                //whatsappService.sendOrderReady(order.getPhone(), order.getId());
            }
        }

        if (hasPaymentStatusChange && !previousPaymentStatus.equals(nextPaymentStatus)) {
            recordPaymentEvent(order.getId(), previousPaymentStatus, nextPaymentStatus, 
                    order.getGrandTotal(), order.getPaymentMethod(), normalizedActor, now);
        }

        return buildAdminOrderResponses(List.of(order)).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    @Transactional
    public void markOrderPaidByRazorpayOrderId(String razorpayOrderId) {
        Order order = orderRepo.findByRazorpayOrderId(razorpayOrderId)
               .orElseThrow(() -> new IllegalArgumentException("Order not found for razorpayOrderId: " + razorpayOrderId));

       log.info("[PaymentGateway] Marking order PAID via Razorpay | orderId={} orderNumber={} razorpayOrderId={}",
               order.getId(), order.getOrderNumber(), razorpayOrderId);

       if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
           log.info("[PaymentGateway] Order already PAID; duplicate Razorpay success event is idempotent | orderId={}",
                   order.getId());
           return;
       }

       order.setPaymentStatus("PAID");
       order.setPaymentMethod(PaymentMethod.RAZORPAY);
       orderRepo.save(order);

       log.info("[PaymentGateway] Order payment confirmed | orderId={} orderNumber={} paymentStatus=PAID | Now eligible for Kitchen Queue",
               order.getId(), order.getOrderNumber());

       // whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }

    @Transactional
    public void markOrderPaidByWallet(Long orderId) {
       Order order = orderRepo.findById(orderId).orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

       log.info("[PaymentGateway] Marking order PAID via Wallet | orderId={} orderNumber={}",
               order.getId(), order.getOrderNumber());

       order.setPaymentStatus("PAID");
       order.setPaymentMethod(PaymentMethod.WALLET);
       orderRepo.save(order);

       log.info("[PaymentGateway] Order payment confirmed | orderId={} orderNumber={} paymentStatus=PAID | Now eligible for Kitchen Queue",
               order.getId(), order.getOrderNumber());

       // whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }

    /**
     * Builds a location filter Specification from a resolved scope.
     * @return {@code null} when the scope is empty (SUPER_ADMIN "All Locations", no
     *         filter); a Specification restricting to the scope's IDs otherwise
     *         (an empty ID list yields a predicate that matches nothing).
     */
    private Specification<Order> locationScopeSpec(Optional<List<Long>> scope) {
        if (scope == null || scope.isEmpty()) {
            return null;
        }
        List<Long> ids = scope.get();
        if (ids.isEmpty()) {
            return (root, cq, cb) -> cb.disjunction();
        }
        return (root, cq, cb) -> root.get("location").get("id").in(ids);
    }

    private Specification<Order> matchesQuery(String rawQuery) {        String normalized = rawQuery.trim().toLowerCase(Locale.ROOT);
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

        LocalDateTime now = BusinessTime.now();
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
        TaxSummary taxSummary = taxSummary(order, orderItems, menuById);
        response.setBaseAmount(MoneyService.amount(orderItems.stream()
                .map(OrderItem::getGrossBaseAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)));
        response.setDiscountAmount(MoneyService.amount(order.getCouponDiscount()));
        response.setTaxableAmount(taxSummary.taxableAmount());
        response.setCgstAmount(taxSummary.cgstAmount());
        response.setSgstAmount(taxSummary.sgstAmount());
        response.setIgstAmount(taxSummary.igstAmount());
        response.setTotalTax(taxSummary.totalTax());
        response.setCustomerPaid(MoneyService.amount(order.getGrandTotal()));
        response.setInvoiceAvailable(order.getId() != null && order.getGrandTotal() != null);

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
                double unitPrice = orderItem.getUnitCustomerPrice() != null
                        ? orderItem.getUnitCustomerPrice().doubleValue()
                        : orderItem.getSellingPriceSnapshot() != null
                        ? orderItem.getSellingPriceSnapshot().doubleValue()
                        : pricingService.getCurrentSellingPrice(menuItem.getId()).doubleValue();
                itemSummary.setPrice(unitPrice);
                itemSummary.setImageUrl(menuItem.getImageUrl());
                itemSummary.setIsVeg(menuItem.getIsVeg());
                itemSummary.setCategory(menuItem.getCategory() != null ? menuItem.getCategory().getName() : null);
                itemSummary.setCategoryImageUrl(menuItem.getCategory() != null ? menuItem.getCategory().getImageUrl() : null);
                double subtotal = orderItem.getTotalCustomerPrice() != null
                        ? orderItem.getTotalCustomerPrice().doubleValue()
                        : unitPrice * orderItem.getQuantity();
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
                    historyEntry.setPerformedByUserId(entry.getPerformedByUserId());
                    historyEntry.setNote(entry.getNote());
                    historyEntry.setReason(entry.getReason());
                    historyEntry.setActionType(entry.getActionType());
                    historyEntry.setChangedAt(entry.getChangedAt());
                    return historyEntry;
                })
                .toList();
        response.setHistory(history);
        return response;
    }

    private TaxSummary taxSummary(Order order, List<OrderItem> items, Map<Long, MenuItem> menuById) {
        TaxSummary stored = new TaxSummary(
                sumTax(items, OrderItem::getTaxableAmount),
                sumTax(items, OrderItem::getCgstAmount),
                sumTax(items, OrderItem::getSgstAmount),
                sumTax(items, OrderItem::getIgstAmount),
                sumTax(items, OrderItem::getTotalTax));
        if (stored.totalTax().compareTo(BigDecimal.ZERO) > 0
                || taxCalculationService == null || items.isEmpty()) return stored;

        List<TaxCalculationService.TaxCalculationResult> calculated = new ArrayList<>();
        for (OrderItem item : items) {
            MenuItem menuItem = menuById.get(item.getItemId());
            if (menuItem == null || menuItem.getTaxProfile() == null
                    || !Boolean.TRUE.equals(menuItem.getTaxProfile().getActive())
                    || menuItem.getTaxProfile().getGstRate() == null
                    || menuItem.getTaxProfile().getGstRate().compareTo(BigDecimal.ZERO) <= 0) {
                return stored;
            }
            BigDecimal customerAmount = item.getTotalCustomerPrice();
            if (customerAmount == null || customerAmount.compareTo(BigDecimal.ZERO) <= 0) {
                customerAmount = item.getLineTotal();
            }
            if (customerAmount == null || customerAmount.compareTo(BigDecimal.ZERO) <= 0) return stored;
            BigDecimal divisor = BigDecimal.ONE.add(menuItem.getTaxProfile().getGstRate()
                    .divide(BigDecimal.valueOf(100), 8, MoneyService.ROUNDING));
            BigDecimal taxable = customerAmount.divide(divisor, MoneyService.SCALE, MoneyService.ROUNDING);
            calculated.add(taxCalculationService.calculate(taxable, menuItem.getTaxProfile()));
        }
        return new TaxSummary(
                sumTax(calculated, TaxCalculationService.TaxCalculationResult::taxableAmount),
                sumTax(calculated, TaxCalculationService.TaxCalculationResult::cgstAmount),
                sumTax(calculated, TaxCalculationService.TaxCalculationResult::sgstAmount),
                sumTax(calculated, TaxCalculationService.TaxCalculationResult::igstAmount),
                sumTax(calculated, TaxCalculationService.TaxCalculationResult::totalTax));
    }

    private static <T> BigDecimal sumTax(List<T> values, java.util.function.Function<T, BigDecimal> getter) {
        return MoneyService.amount(values.stream().map(getter).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private record TaxSummary(BigDecimal taxableAmount, BigDecimal cgstAmount,
                              BigDecimal sgstAmount, BigDecimal igstAmount, BigDecimal totalTax) {}

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

        LocalDateTime now = BusinessTime.now();
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
        if (req.getLocationId() != null) {
            Location requestedLocation = locationRepository.findById(req.getLocationId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found: " + req.getLocationId()));
            if (user != null) locationAccessService.requireLocationAccess(user, req.getLocationId());
            order.setLocation(requestedLocation);
        }
        if (req.getCustomerNote() != null && !req.getCustomerNote().isBlank()) {
            order.setAdminNote(req.getCustomerNote());
        }

        // ── Build item list and resolve location before order number generation ────
        List<Object[]> itemSnaps = new java.util.ArrayList<>();
        java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

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
            // Scope the pre-order to the location of its items (menu is location-owned).
            if (order.getLocation() == null && menuItem.getLocation() != null) {
                order.setLocation(menuItem.getLocation());
            }
            Long vendorId = menuItem.getVendor() != null ? menuItem.getVendor().getId() : null;
            log.info("[createPreOrder] MenuItem found — id={} name='{}' vendorId={}", menuItem.getId(), menuItem.getName(), vendorId);

            PricingService.OrderItemSnapshot snap = pricingService.createSnapshot(i.getItemId(), vendorId, i.getQuantity());
            log.info("[createPreOrder] Snapshot — itemId={} qty={} sellingPrice={} lineTotal={}",
                    i.getItemId(), i.getQuantity(), snap.sellingPriceSnapshot(), snap.lineTotal());

            if (snap.sellingPriceSnapshot() == null || snap.sellingPriceSnapshot().compareTo(java.math.BigDecimal.ZERO) == 0) {
                log.warn("[createPreOrder] WARNING — itemId={} has ZERO selling price. Razorpay will reject amount=0.", i.getItemId());
            }

            itemSnaps.add(new Object[]{i, snap});
            subtotal = subtotal.add(snap.lineTotal());
        }

        // ── Validate location and extract location code ────────────────────────────
        if (order.getLocation() == null) {
            throw new OrderValidationException("LOCATION_REQUIRED", "Pre-order must have a location");
        }
        
        String locationCode = order.getLocation().getCode();
        if (locationCode == null || locationCode.isBlank()) {
            throw new OrderValidationException(
                "LOCATION_CODE_MISSING",
                "Location '" + order.getLocation().getName() + "' has no location code. " +
                "Location code is required to generate the order number."
            );
        }

        // ── Generate location-specific order number with pessimistic locking
        String orderNumber = orderNumberGenerator.generateOrderNumber(locationCode, now.toLocalDate());
        order.setOrderNumber(orderNumber);
        order.setLocationCode(locationCode); // Store immutable location code snapshot
        log.info("[createPreOrder] Order number generated: {}", orderNumber);

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

        List<TaxCalculationService.TaxCalculationResult> adjustedTaxes =
                calculateDiscountedTaxes(itemSnaps, couponDiscount);
        for (int index = 0; index < itemSnaps.size(); index++) {
            Object[] pair = itemSnaps.get(index);
            itemSnaps.set(index, new Object[]{pair[0], pair[1], adjustedTaxes.get(index)});
        }
        BigDecimal baseSubtotal = itemSnaps.stream()
                .map(pair -> ((PricingService.OrderItemSnapshot) pair[1]).lineTotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setSubtotal(baseSubtotal);
        java.math.BigDecimal tax = itemSnaps.stream()
                .map(pair -> ((TaxCalculationService.TaxCalculationResult) pair[2]).totalTax())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTax(tax);
        order.setGrandTotal(MoneyService.amount(baseSubtotal.subtract(couponDiscount).add(tax)));
        log.info("[createPreOrder] Totals — subtotal={} couponDiscount={} grandTotal={}",
                subtotal, couponDiscount, order.getGrandTotal());

        log.info("[createPreOrder] Saving order ...");
        order = orderRepo.save(order);
        log.info("[createPreOrder] Order saved — id={}", order.getId());

        recordStatusHistory(order.getId(), null, OrderStatus.PRE_ORDERED, "Pre-order created for " + req.getScheduledAt(), "SYSTEM", now);

        for (Object[] pair : itemSnaps) {
            CreateOrderRequest.Item i = (CreateOrderRequest.Item) pair[0];
            PricingService.OrderItemSnapshot snap = (PricingService.OrderItemSnapshot) pair[1];
            TaxCalculationService.TaxCalculationResult adjustedTax =
                    (TaxCalculationService.TaxCalculationResult) pair[2];
            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setItemId(i.getItemId());
            oi.setQuantity(i.getQuantity());
            oi.setSellingPriceSnapshot(snap.sellingPriceSnapshot());
            oi.setCostPriceSnapshot(snap.costPriceSnapshot());
            oi.setProfitSnapshot(snap.profitSnapshot());
            oi.setLineTotal(adjustedTax.totalAmount());
            applyTaxSnapshot(oi, snap, adjustedTax,
                    snap.lineTotal().subtract(adjustedTax.taxableAmount()));
            orderItemRepo.save(oi);
            log.info("[createPreOrder] OrderItem saved — orderId={} itemId={} qty={} lineTotal={}",
                    order.getId(), i.getItemId(), i.getQuantity(), snap.lineTotal());
        }
        invoiceService.createIfAbsent(order);

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
            Optional<List<Long>> locationScope,
            Pageable pageable) {

        Specification<Order> spec = (root, cq, cb) -> cb.isTrue(root.get("preOrder"));

        Specification<Order> locationSpec = locationScopeSpec(locationScope);
        if (locationSpec != null) {
            spec = spec.and(locationSpec);
        }

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
    public AdminPreOrderDashboardResponse getAdminPreOrderDashboard(int upcomingLimit, Optional<List<Long>> locationScope) {
        if (locationScope.isPresent() && locationScope.get().isEmpty()) {
            AdminPreOrderDashboardResponse empty = new AdminPreOrderDashboardResponse();
            empty.setUpcomingQueue(List.of());
            return empty;
        }
        Specification<Order> preOrderSpec = (root, cq, cb) -> cb.isTrue(root.get("preOrder"));
        Specification<Order> locationSpec = locationScopeSpec(locationScope);
        if (locationSpec != null) {
            preOrderSpec = preOrderSpec.and(locationSpec);
        }
        List<Order> allPreOrders = orderRepo.findAll(preOrderSpec, Sort.by(Sort.Order.asc("scheduledAt")));

        LocalDateTime now = BusinessTime.now();
        LocalDate today = BusinessTime.today();
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
        LocalDateTime now = BusinessTime.now();
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

    private void validateTransition(OrderStatus currentStatus, OrderStatus nextStatus, Order order, String reason) {
        List<OrderStatus> allowed = allowedTransitionsFor(currentStatus);
        if (!allowed.contains(nextStatus)) {
            throw new IllegalArgumentException("Cannot move order from " + currentStatus + " to " + nextStatus);
        }
        
        // Corrective transitions require a reason (audit trail)
        if (isCorrectiveTransition(currentStatus, nextStatus)) {
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("Reason is required for corrective transition from " + currentStatus + " to " + nextStatus);
            }
        }
        
        // CRITICAL: Payment eligibility check for kitchen workflow
        // ORDER_PLACED → PREPARING requires payment to be eligible (PAID or PAY_AT_STALL/WALLET pending)
        if (currentStatus == OrderStatus.ORDER_PLACED && nextStatus == OrderStatus.PREPARING) {
            String paymentStatus = order != null ? order.getPaymentStatus() : null;
            PaymentMethod paymentMethod = order != null ? order.getPaymentMethod() : null;
            
            boolean isKitchenEligible = isOrderKitchenEligible(paymentStatus, paymentMethod);
            if (!isKitchenEligible) {
                throw new OrderValidationException(
                    "PAYMENT_NOT_CONFIRMED",
                    "Order cannot enter kitchen until payment is confirmed. " +
                    "Current payment status: " + paymentStatus + ", payment method: " + paymentMethod
                );
            }
        }
        
        // Payment gate: READY → COMPLETED (hand over) requires PAID status
        // This does NOT apply to COMPLETED → READY correction
        if (currentStatus == OrderStatus.READY && nextStatus == OrderStatus.COMPLETED) {
            String paymentStatus = order != null ? order.getPaymentStatus() : null;
            if (paymentStatus == null || !paymentStatus.equalsIgnoreCase("PAID")) {
                throw new OrderValidationException(
                    "PAYMENT_REQUIRED_FOR_HANDOVER",
                    "Order cannot be handed over until payment is completed. Current payment status: " + paymentStatus
                );
            }
        }
    }
    
    /**
     * Determines if an order is eligible to enter the kitchen queue.
     * 
     * Kitchen-eligible means:
     * - Payment is PAID (for online payment via RAZORPAY), OR
     * - Payment is PENDING and payment method is PAY_AT_STALL or WALLET
     *   (these methods don't require pre-confirmation)
     */
    private boolean isOrderKitchenEligible(String paymentStatus, PaymentMethod paymentMethod) {
        if (paymentStatus == null) {
            return false;
        }
        
        // PAID orders are always kitchen-eligible
        if (paymentStatus.equalsIgnoreCase("PAID")) {
            return true;
        }
        
        // PENDING payment only eligible for PAY_AT_STALL and WALLET (not RAZORPAY)
        if (paymentStatus.equalsIgnoreCase("PENDING")) {
            return paymentMethod == PaymentMethod.PAY_AT_STALL || paymentMethod == PaymentMethod.WALLET;
        }
        
        // FAILED or any other status = not kitchen eligible
        return false;
    }
    
    /**
     * Determines if a transition is corrective (backward in the normal workflow).
     * Corrective transitions require a reason for audit trail.
     */
    private boolean isCorrectiveTransition(OrderStatus from, OrderStatus to) {
        // COMPLETED → READY is a corrective transition
        if (from == OrderStatus.COMPLETED && to == OrderStatus.READY) {
            return true;
        }
        // READY → PREPARING is a corrective transition
        if (from == OrderStatus.READY && to == OrderStatus.PREPARING) {
            return true;
        }
        return false;
    }

    private List<OrderStatus> allowedTransitionsFor(OrderStatus status) {
        if (status == null) {
            return List.of();
        }
        return switch (status) {
            // Pre-ordered can move to placed or cancelled
            case PRE_ORDERED -> List.of(OrderStatus.ORDER_PLACED, OrderStatus.CANCELLED);
            // Placed: forward to preparing/ready/completed, backward none, cancel anytime
            case ORDER_PLACED -> List.of(OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            // Acknowledged: no transitions (not currently used in kitchen flow)
            case ACKNOWLEDGED -> List.of();
            // Preparing: forward to ready/completed, backward to placed, cancel anytime
            case PREPARING -> List.of(OrderStatus.ORDER_PLACED, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            // Ready: forward to completed, backward to preparing, cancel anytime
            case READY -> List.of(OrderStatus.PREPARING, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            // Delivered: no transitions (party orders only)
            case DELIVERED -> List.of();
            // Cancelled: terminal state, no transitions
            case CANCELLED -> List.of();
            // Completed: corrective transition back to READY (requires reason and authorization)
            case COMPLETED -> List.of(OrderStatus.READY);
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
                                     LocalDateTime changedAt,
                                     String reason,
                                     Long performedByUserId,
                                     String actionType) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(orderId);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setNote(note);
        history.setChangedBy(changedBy);
        history.setPerformedByUserId(performedByUserId);
        history.setReason(reason);
        history.setActionType(actionType != null ? actionType : "STATUS_CHANGE");
        LocalDateTime now = BusinessTime.now();
        history.setChangedAt(changedAt != null ? changedAt : now);
        history.setCreatedAt(changedAt != null ? changedAt : now);
        orderStatusHistoryRepository.save(history);
    }

    // Overload for backward compatibility with existing callers
    private void recordStatusHistory(Long orderId,
                                     OrderStatus previousStatus,
                                     OrderStatus newStatus,
                                     String note,
                                     String changedBy,
                                     LocalDateTime changedAt) {
        recordStatusHistory(orderId, previousStatus, newStatus, note, changedBy, changedAt, null, null, "STATUS_CHANGE");
    }

    /**
     * Records a payment status change event in the payment_events table.
     * This creates an immutable audit trail for all manual payment updates.
     */
    private void recordPaymentEvent(Long orderId, 
                                   String previousStatus, 
                                   String newStatus,
                                   java.math.BigDecimal amount,
                                   PaymentMethod paymentMethod,
                                   String performedBy,
                                   LocalDateTime createdAt) {
        PaymentEvent event = new PaymentEvent();
        event.setOrderId(orderId);
        event.setPreviousStatus(previousStatus);
        event.setNewStatus(newStatus);
        event.setAmount(amount);
        event.setPaymentMethod(paymentMethod);
        event.setPerformedBy(performedBy);
        event.setCreatedAt(createdAt != null ? createdAt : BusinessTime.now());
        paymentEventRepository.save(event);
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
                            return (mi != null && mi.getVendor() != null) ? mi.getVendor().getId() : null;
                        } catch (Exception e) { return null; }
                    }).orElse(null);

            CartContext cartCtx = new CartContext(restaurantId, subtotal, java.math.BigDecimal.ZERO, items);
            EligibilityContext ctx = new EligibilityContext(userCtx, cartCtx, BusinessTime.now());

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
