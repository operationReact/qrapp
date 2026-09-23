package com.broandbro.qrapp.service;
import com.broandbro.qrapp.dto.VendorOrderCreateRequest;
import com.broandbro.qrapp.dto.VendorOrderResponse;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Vendor;
import com.broandbro.qrapp.entity.VendorOrder;
import com.broandbro.qrapp.entity.VendorOrderItem;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.exception.InvalidOrderStatusTransitionException;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.VendorOrderRepository;
import com.broandbro.qrapp.repository.VendorRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
@Service
@Transactional
public class VendorOrderService {
    private static final Logger log = LoggerFactory.getLogger(VendorOrderService.class);
    private final VendorOrderRepository vendorOrderRepository;
    private final VendorRepository vendorRepository;
    private final MenuRepository menuRepository;
    private final PricingService pricingService;
    private final LocationAccessService locationAccessService;
    private static final Map<OrderStatus, List<OrderStatus>> ALLOWED_TRANSITIONS = new HashMap<>();
    static {
        ALLOWED_TRANSITIONS.put(OrderStatus.ORDER_PLACED, List.of(OrderStatus.ACKNOWLEDGED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.ACKNOWLEDGED, List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.DELIVERED, List.of(OrderStatus.COMPLETED));
        ALLOWED_TRANSITIONS.put(OrderStatus.COMPLETED, List.of());
        ALLOWED_TRANSITIONS.put(OrderStatus.CANCELLED, List.of());
    }
    public VendorOrderService(VendorOrderRepository vendorOrderRepository, VendorRepository vendorRepository, MenuRepository menuRepository, PricingService pricingService, LocationAccessService locationAccessService) {
        this.vendorOrderRepository = vendorOrderRepository;
        this.vendorRepository = vendorRepository;
        this.menuRepository = menuRepository;
        this.pricingService = pricingService;
        this.locationAccessService = locationAccessService;
    }
    public VendorOrderResponse createOrder(VendorOrderCreateRequest request, User actor) {
        // Validate vendor exists
        Vendor vendor = vendorRepository.findById(request.getVendorId())
            .orElseThrow(() -> new RuntimeException("Vendor not found: " + request.getVendorId()));
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
            // Validate item belongs to the vendor
            if (item.getVendor() == null || !item.getVendor().getId().equals(request.getVendorId())) {
                throw new RuntimeException("Menu item " + itemReq.getMenuItemId() + " does not belong to vendor " + request.getVendorId());
            }
            menuItems.add(item);
        }
        // Derive the owning location from the ordered menu items (all share a
        // location by construction) and enforce the caller can act on it.
        Location location = resolveOrderLocation(menuItems);
        if (actor != null && location != null) {
            locationAccessService.requireLocationAccess(actor, location.getId());
        }
        // Create VendorOrder
        VendorOrder order = new VendorOrder();
        order.setVendor(vendor);
        order.setLocation(location);
        order.setStatus(OrderStatus.ORDER_PLACED);
        order.setNotes(request.getNotes());
        order.setOrderedBy(actor != null && actor.getPhone() != null ? actor.getPhone() : "ADMIN");
        // Create VendorOrderItems with price snapshots
        List<VendorOrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (int i = 0; i < request.getItems().size(); i++) {
            var itemReq = request.getItems().get(i);
            MenuItem menuItem = menuItems.get(i);
            // Resolve procurement (cost) price from history – NOT selling price
            BigDecimal costPrice = pricingService
                    .getCurrentVendorCost(vendor.getId(), menuItem.getId())
                    .orElseGet(() -> {
                        log.warn("No active vendor cost for vendorId={} menuItemId={} – defaulting to ZERO",
                                vendor.getId(), menuItem.getId());
                        return BigDecimal.ZERO;
                    });
            VendorOrderItem orderItem = new VendorOrderItem();
            orderItem.setMenuItem(menuItem);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setCostPriceSnapshot(costPrice);
            orderItem.setLineTotal(costPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity())));
            orderItem.setVendorOrder(order);
            orderItems.add(orderItem);
            // Compute total
            totalAmount = totalAmount.add(orderItem.getLineTotal());
        }
        order.setTotalAmount(totalAmount);
        VendorOrder savedOrder = vendorOrderRepository.save(order);
        log.info("Vendor order created with id: {} for vendor: {}", savedOrder.getId(), vendor.getId());
        // TODO: Publish VendorOrderCreatedEvent for async WhatsApp to vendor
        return mapToResponse(savedOrder);
    }
    public VendorOrderResponse getOrder(Long orderId, Optional<List<Long>> locationScope) {
        VendorOrder order = vendorOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        assertWithinScope(order, locationScope);
        return mapToResponse(order);
    }
    public List<VendorOrderResponse> listOrders(Optional<List<Long>> locationScope) {
        List<VendorOrder> orders = isUnfiltered(locationScope)
                ? vendorOrderRepository.findAll()
                : vendorOrderRepository.findByLocationIdInOrderByCreatedAtDesc(scopeIdsOrSentinel(locationScope));
        return orders.stream().map(this::mapToResponse).toList();
    }
    public VendorOrderResponse transitionOrderStatus(Long orderId, OrderStatus newStatus,
                                                     Optional<List<Long>> locationScope) {
        VendorOrder order = vendorOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        assertWithinScope(order, locationScope);
        OrderStatus currentStatus = order.getStatus();
        List<OrderStatus> allowedNextStates = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, new ArrayList<>());
        if (!allowedNextStates.contains(newStatus)) {
            throw new InvalidOrderStatusTransitionException(
                "Invalid transition from " + currentStatus + " to " + newStatus
            );
        }
        order.setStatus(newStatus);
        VendorOrder updatedOrder = vendorOrderRepository.save(order);
        log.info("Order {} status updated to {}", orderId, newStatus);
        return mapToResponse(updatedOrder);
    }

    // ── Location scope helpers ───────────────────────────────────────────────

    /** Dominant/first location among the ordered menu items; null when none carry one. */
    private Location resolveOrderLocation(List<MenuItem> menuItems) {
        return menuItems.stream()
                .map(MenuItem::getLocation)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private boolean isUnfiltered(Optional<List<Long>> locationScope) {
        return locationScope == null || locationScope.isEmpty();
    }

    private List<Long> scopeIdsOrSentinel(Optional<List<Long>> locationScope) {
        List<Long> ids = locationScope.get();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    private void assertWithinScope(VendorOrder order, Optional<List<Long>> locationScope) {
        if (isUnfiltered(locationScope)) {
            return;
        }
        Long locationId = order.getLocation() != null ? order.getLocation().getId() : null;
        if (locationId == null || !locationScope.get().contains(locationId)) {
            throw new AccessDeniedException("location_access_denied");
        }
    }

    private VendorOrderResponse mapToResponse(VendorOrder order) {
        VendorOrderResponse response = new VendorOrderResponse();
        response.setId(order.getId());
        response.setVendorId(order.getVendor() != null ? order.getVendor().getId() : null);
        response.setLocationId(order.getLocation() != null ? order.getLocation().getId() : null);
        response.setStatus(order.getStatus());
        response.setTotalAmount(order.getTotalAmount());
        response.setNotes(order.getNotes());
        response.setOrderedBy(order.getOrderedBy());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        return response;
    }
}
