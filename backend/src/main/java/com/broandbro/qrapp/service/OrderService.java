package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuRepository menuRepository;
    private final WhatsAppService whatsappService;

    public Order createOrder(CreateOrderRequest req, User user) {
        Order order = new Order();
        order.setPhone(user != null ? user.getPhone() : req.getPhone());
        order.setUserId(user != null ? user.getId() : null);
        order.setStatus(OrderStatus.PLACED);
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY);
        order.setCreatedAt(LocalDateTime.now());

        order = orderRepo.save(order);

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

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setStatus(status);
        orderRepo.save(order);

        if (OrderStatus.READY.equals(status)) {
            whatsappService.sendOrderReady(order.getPhone(), order.getId());
        }
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
}