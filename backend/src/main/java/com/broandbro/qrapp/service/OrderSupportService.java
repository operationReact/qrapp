package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderSupportRequest;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.OrderSupportRequestRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrderSupportService {

    private static final Set<OrderStatus> SUPPORT_ELIGIBLE_STATUSES =
            EnumSet.of(OrderStatus.COMPLETED, OrderStatus.CANCELLED);

    private final OrderRepository orderRepo;
    private final OrderSupportRequestRepository supportRequestRepo;

    @Transactional
    public OrderSupportRequest raiseRequest(Long orderId, User user, String message) {
        // Locking the order serializes concurrent submissions for the same order; the partial unique index is the backstop.
        Order order = orderRepo.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        boolean owns = (user.getId() != null && user.getId().equals(order.getUserId()))
                || (user.getPhone() != null && user.getPhone().equals(order.getPhone()));
        if (!owns) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }
        if (!SUPPORT_ELIGIBLE_STATUSES.contains(order.getStatus())) {
            throw new IllegalArgumentException(
                    "Support requests can be raised once an order is completed or cancelled.");
        }
        if (supportRequestRepo.existsByOrderIdAndStatus(orderId, OrderSupportRequest.STATUS_OPEN)) {
            throw new IllegalArgumentException("A support request is already open for this order.");
        }

        OrderSupportRequest request = new OrderSupportRequest();
        request.setOrderId(orderId);
        request.setUserId(user.getId());
        request.setMessage(message.trim());
        request.setStatus(OrderSupportRequest.STATUS_OPEN);
        request.setCreatedAt(BusinessTime.now());
        try {
            return supportRequestRepo.saveAndFlush(request);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("A support request is already open for this order.");
        }
    }

    @Transactional(readOnly = true)
    public List<OrderSupportRequest> listForOrder(Long orderId) {
        return supportRequestRepo.findAllByOrderIdOrderByCreatedAtDesc(orderId);
    }

    @Transactional
    public OrderSupportRequest resolveRequest(Long orderId, Long requestId, String actor) {
        OrderSupportRequest request = supportRequestRepo.findById(requestId)
                .filter(r -> orderId.equals(r.getOrderId()))
                .orElseThrow(() -> new IllegalArgumentException("Support request not found: " + requestId));
        if (!OrderSupportRequest.STATUS_OPEN.equals(request.getStatus())) {
            throw new IllegalArgumentException("This support request is already resolved.");
        }
        request.setStatus(OrderSupportRequest.STATUS_RESOLVED);
        request.setResolvedAt(BusinessTime.now());
        request.setResolvedBy(actor);
        return supportRequestRepo.save(request);
    }
}
