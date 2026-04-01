package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuRepository menuRepo;
    private final WhatsAppService whatsappService;

    public Order createOrder(CreateOrderRequest req) {
        Order order = new Order();
        order.setPhone(req.getPhone());
        order.setStatus(OrderStatus.PLACED);
        order.setPaymentStatus("PENDING");
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

    /**
     * Calculate total amount (in smallest currency unit, e.g., paise) for the order by summing menu item prices.
     */
    public int calculateAmountForOrder(Long orderId) {
        double total = orderItemRepo.findAll()
                .stream()
                .filter(oi -> orderId.equals(oi.getOrderId()))
                .mapToDouble(oi -> menuRepo.findById(oi.getItemId()).map(menuItem -> menuItem.getPrice() * oi.getQuantity()).orElse(0.0))
                .sum();

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
        Order order = orderRepo.findAll()
                .stream()
                .filter(o -> razorpayOrderId.equals(o.getRazorpayOrderId()))
                .findFirst()
                .orElseThrow();

        order.setPaymentStatus("PAID");
        orderRepo.save(order);

        whatsappService.sendOrderPlaced(order.getPhone(), order.getId());
    }
}