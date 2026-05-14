package com.broandbro.qrapp.service;
import com.broandbro.qrapp.dto.ShopOrderCreateRequest;
import com.broandbro.qrapp.dto.ShopOrderResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Shop;
import com.broandbro.qrapp.entity.ShopOrder;
import com.broandbro.qrapp.entity.ShopOrderItem;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.exception.InvalidOrderStatusTransitionException;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.ShopOrderRepository;
import com.broandbro.qrapp.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
@Service
@Transactional
public class ShopOrderService {
    private static final Logger log = LoggerFactory.getLogger(ShopOrderService.class);
    private final ShopOrderRepository shopOrderRepository;
    private final ShopRepository shopRepository;
    private final MenuRepository menuRepository;
    private static final Map<OrderStatus, List<OrderStatus>> ALLOWED_TRANSITIONS = new HashMap<>();
    static {
        ALLOWED_TRANSITIONS.put(OrderStatus.ORDER_PLACED, List.of(OrderStatus.ACKNOWLEDGED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.ACKNOWLEDGED, List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.DELIVERED, List.of(OrderStatus.COMPLETED));
        ALLOWED_TRANSITIONS.put(OrderStatus.COMPLETED, List.of());
        ALLOWED_TRANSITIONS.put(OrderStatus.CANCELLED, List.of());
    }
    public ShopOrderService(ShopOrderRepository shopOrderRepository, ShopRepository shopRepository, MenuRepository menuRepository) {
        this.shopOrderRepository = shopOrderRepository;
        this.shopRepository = shopRepository;
        this.menuRepository = menuRepository;
    }
    public ShopOrderResponse createOrder(ShopOrderCreateRequest request) {
        // Validate shop exists
        Shop shop = shopRepository.findById(request.getShopId())
            .orElseThrow(() -> new RuntimeException("Shop not found: " + request.getShopId()));
        // Validate items
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Order items cannot be empty");
        }
        List<MenuItem> menuItems = new ArrayList<>();
        for (var itemReq : request.getItems()) {
            MenuItem item = menuRepository.findById(itemReq.getMenuItemId())
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemReq.getMenuItemId()));
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new RuntimeException("Quantity must be > 0 for item: " + itemReq.getMenuItemId());
            }
            // Validate item belongs to the shop
            if (item.getShop() == null || !item.getShop().getId().equals(request.getShopId())) {
                throw new RuntimeException("Menu item " + itemReq.getMenuItemId() + " does not belong to shop " + request.getShopId());
            }
            menuItems.add(item);
        }
        // Create ShopOrder
        ShopOrder order = new ShopOrder();
        order.setShop(shop);
        order.setStatus(OrderStatus.ORDER_PLACED);
        order.setNotes(request.getNotes());
        order.setOrderedBy("ADMIN"); // Could be dynamic from auth
        // Create ShopOrderItems with price snapshots
        List<ShopOrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (int i = 0; i < request.getItems().size(); i++) {
            var itemReq = request.getItems().get(i);
            MenuItem menuItem = menuItems.get(i);
            ShopOrderItem orderItem = new ShopOrderItem();
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setQuantity(itemReq.getQuantity());
            // Snapshot prices
            BigDecimal basePrice = menuItem.getBasePrice() != null ? menuItem.getBasePrice() : BigDecimal.ZERO;
            BigDecimal margin = menuItem.getMargin() != null ? menuItem.getMargin() : BigDecimal.ZERO;
            BigDecimal sellingPrice = basePrice.add(margin);
            orderItem.setBasePriceSnapshot(basePrice);
            orderItem.setMarginSnapshot(margin);
            orderItem.setSellingPriceSnapshot(sellingPrice);
            orderItem.setProductSnapshot(menuItem.getName());
            orderItem.setShopOrder(order);
            orderItems.add(orderItem);
            // Compute total
            totalAmount = totalAmount.add(sellingPrice.multiply(new BigDecimal(itemReq.getQuantity())));
        }
        order.setTotalAmount(totalAmount);
        ShopOrder savedOrder = shopOrderRepository.save(order);
        log.info("Shop order created with id: {} for shop: {}", savedOrder.getId(), shop.getId());
        // TODO: Publish ShopOrderCreatedEvent for async WhatsApp to vendor
        return mapToResponse(savedOrder);
    }
    public ShopOrderResponse getOrder(Long orderId) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        return mapToResponse(order);
    }
    public ShopOrderResponse transitionOrderStatus(Long orderId, OrderStatus newStatus) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        OrderStatus currentStatus = order.getStatus();
        List<OrderStatus> allowedNextStates = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, new ArrayList<>());
        if (!allowedNextStates.contains(newStatus)) {
            throw new InvalidOrderStatusTransitionException(
                "Invalid transition from " + currentStatus + " to " + newStatus
            );
        }
        order.setStatus(newStatus);
        ShopOrder updatedOrder = shopOrderRepository.save(order);
        log.info("Order {} status updated to {}", orderId, newStatus);
        return mapToResponse(updatedOrder);
    }
    private ShopOrderResponse mapToResponse(ShopOrder order) {
        ShopOrderResponse response = new ShopOrderResponse();
        response.setId(order.getId());
        response.setShopId(order.getShop() != null ? order.getShop().getId() : null);
        response.setStatus(order.getStatus());
        response.setTotalAmount(order.getTotalAmount());
        response.setNotes(order.getNotes());
        response.setOrderedBy(order.getOrderedBy());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        return response;
    }
}
