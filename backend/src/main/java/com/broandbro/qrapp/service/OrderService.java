package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.AdminOrderDashboardResponse;
import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.OrderStatusHistory;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.OrderStatusHistoryRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
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
public class OrderService {

    private static final Set<OrderStatus> LIVE_STATUSES = EnumSet.of(OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.READY);

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuRepository menuRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final WhatsAppService whatsappService;

    public Order createOrder(CreateOrderRequest req, User user) {
        LocalDateTime now = LocalDateTime.now();
        Order order = new Order();
        order.setPhone(user != null ? user.getPhone() : req.getPhone());
        order.setUserId(user != null ? user.getId() : null);
        order.setStatus(OrderStatus.PLACED);
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY);
        order.setCreatedAt(now);
        order.setLastStatusChangedAt(now);
        order.setPriority(OrderPriority.NORMAL);

        order = orderRepo.save(order);
        recordStatusHistory(order.getId(), null, OrderStatus.PLACED, "Order created", "SYSTEM", now);

        for (CreateOrderRequest.Item i : req.getItems()) {
            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setItemId(i.getItemId());
            oi.setQuantity(i.getQuantity());
            orderItemRepo.save(oi);
        }

        return order;
    }

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
            summary.setStatus(order.getStatus());
            summary.setPaymentStatus(order.getPaymentStatus());
            summary.setCreatedAt(order.getCreatedAt());

            double total = 0;
            List<UserOrderSummaryResponse.ItemSummary> itemSummaries = new ArrayList<>();
            for (OrderItem orderItem : itemsByOrderId.getOrDefault(order.getId(), List.of())) {
                MenuItem menuItem = menuById.get(orderItem.getItemId());
                UserOrderSummaryResponse.ItemSummary itemSummary = new UserOrderSummaryResponse.ItemSummary();
                itemSummary.setItemId(orderItem.getItemId());
                itemSummary.setQuantity(orderItem.getQuantity());
                if (menuItem != null) {
                    itemSummary.setName(menuItem.getName());
                    itemSummary.setPrice(menuItem.getPrice());
                    itemSummary.setImageUrl(menuItem.getImageUrl());
                    itemSummary.setIsVeg(menuItem.getIsVeg());
                    total += menuItem.getPrice() * orderItem.getQuantity();
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
    public long calculateAmountForItems(java.util.List<CreateOrderRequest.Item> items) {
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
                .mapToDouble(item -> item.getPrice() * quantityByItemId.getOrDefault(item.getId(), 0))
                .sum();
        return Math.round(total * 100);
    }

    /**
     * Calculate total amount (in smallest currency unit, e.g., paise) for the order by summing menu item prices.
     */
    public int calculateAmountForOrder(Long orderId) {
        double total = orderItemRepo.calculateOrderTotal(orderId);

        if (total <= 0.0) return 0;
        return (int) Math.round(total * 100);
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> getAdminOrders(Optional<String> status,
                                                   Optional<String> paymentStatus,
                                                   Optional<String> priority,
                                                   Optional<String> query,
                                                   boolean liveOnly,
                                                   Pageable pageable) {
        Specification<Order> specification = Specification.where(null);

        if (status.isPresent() && !status.get().isBlank()) {
            OrderStatus parsedStatus = parseStatus(status.get());
            specification = specification.and((root, cq, cb) -> cb.equal(root.get("status"), parsedStatus));
        }

        if (paymentStatus.isPresent() && !paymentStatus.get().isBlank()) {
            String normalizedPaymentStatus = paymentStatus.get().trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, cq, cb) -> cb.equal(cb.upper(root.get("paymentStatus")), normalizedPaymentStatus));
        }

        if (priority.isPresent() && !priority.get().isBlank()) {
            OrderPriority parsedPriority = parsePriority(priority.get());
            specification = specification.and((root, cq, cb) -> cb.equal(root.get("priority"), parsedPriority));
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
        return buildAdminOrderResponses(
                orderRepo.findAllByStatusInOrderByCreatedAtAscIdAsc(LIVE_STATUSES, PageRequest.of(0, safeLimit))
        );
    }

    @Transactional(readOnly = true)
    public AdminOrderDashboardResponse getAdminDashboard(int liveLimit) {
        List<Order> allOrders = orderRepo.findAll(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        AdminOrderDashboardResponse response = new AdminOrderDashboardResponse();
        response.setTotalOrders(allOrders.size());
        response.setPlacedOrders(countByStatus(allOrders, OrderStatus.PLACED));
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
                .filter(order -> order.isDelayed() || order.getStatus() == OrderStatus.READY || order.getPriority() == OrderPriority.URGENT)
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
        boolean hasPriorityChange = request != null && request.getPriority() != null && !request.getPriority().isBlank();
        boolean hasNoteChange = request != null && request.getAdminNote() != null;
        if (!hasStatusChange && !hasPriorityChange && !hasNoteChange) {
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

        if (hasPriorityChange) {
            order.setPriority(parsePriority(request.getPriority()));
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
                whatsappService.sendOrderReady(order.getPhone(), order.getId());
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

        whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }

    @Transactional
    public void markOrderPaidByWallet(Long orderId) {
        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(PaymentMethod.WALLET);
        orderRepo.save(order);

        whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
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

        LocalDateTime now = LocalDateTime.now();
        List<AdminOrderResponse> responses = new ArrayList<>();
        for (Order order : orders) {
            responses.add(toAdminOrderResponse(order, itemsByOrderId.getOrDefault(order.getId(), List.of()), menuById, historyByOrderId.getOrDefault(order.getId(), List.of()), now));
        }
        return responses;
    }

    private AdminOrderResponse toAdminOrderResponse(Order order,
                                                    List<OrderItem> orderItems,
                                                    Map<Long, MenuItem> menuById,
                                                    List<OrderStatusHistory> historyEntries,
                                                    LocalDateTime now) {
        AdminOrderResponse response = new AdminOrderResponse();
        response.setId(order.getId());
        response.setPhone(order.getPhone());
        response.setUserId(order.getUserId());
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setCreatedAt(order.getCreatedAt());
        response.setLastStatusChangedAt(order.getLastStatusChangedAt());
        response.setStartedAt(order.getStartedAt());
        response.setReadyAt(order.getReadyAt());
        response.setCompletedAt(order.getCompletedAt());
        response.setPriority(order.getPriority() != null ? order.getPriority() : OrderPriority.NORMAL);
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
                itemSummary.setPrice(menuItem.getPrice());
                itemSummary.setImageUrl(menuItem.getImageUrl());
                itemSummary.setIsVeg(menuItem.getIsVeg());
                double subtotal = menuItem.getPrice() * orderItem.getQuantity();
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
            case PLACED -> List.of(OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case PREPARING -> List.of(OrderStatus.PLACED, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
            case READY -> List.of(OrderStatus.PREPARING, OrderStatus.COMPLETED, OrderStatus.CANCELLED);
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
            case PLACED -> stageAge >= 5;
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

    private OrderPriority parsePriority(String rawPriority) {
        try {
            return OrderPriority.valueOf(rawPriority.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported order priority: " + rawPriority);
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
}