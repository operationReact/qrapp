package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Wallet payment for an existing order. Lives outside WalletService to avoid a
 * dependency cycle (OrderService -> RefundService -> WalletService).
 */
@Service
@RequiredArgsConstructor
public class WalletOrderPaymentService {
    private static final String PAYMENT_PENDING = "PENDING";
    private static final String PAYMENT_PAID = "PAID";

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final WalletService walletService;

    /**
     * Debits the wallet for a persisted order and marks it PAID in one transaction.
     * The order row is locked before the wallet row, the same order used by customer
     * cancellation (order lock, then refund credit), so the two paths cannot deadlock.
     */
    @Transactional
    public void payOrderFromWallet(User user, Long orderId, BigDecimal clientAmount) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User authentication required");
        }
        if (orderId == null) {
            throw new IllegalArgumentException("orderId is required");
        }

        Order order = orderRepository.findByIdForUpdate(orderId)
                .filter(o -> user.getId().equals(o.getUserId()))
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (PAYMENT_PAID.equals(order.getPaymentStatus())) {
            throw new DuplicateTransactionException("Order is already paid");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cancelled orders cannot be paid");
        }
        if (order.getPaymentMethod() != PaymentMethod.WALLET || !PAYMENT_PENDING.equals(order.getPaymentStatus())) {
            throw new IllegalArgumentException("This order is not payable from wallet");
        }
        if (order.getGrandTotal() == null) {
            throw new IllegalArgumentException("Order has no payable amount");
        }

        BigDecimal payableAmount = order.getGrandTotal().setScale(2, RoundingMode.HALF_UP);
        if (payableAmount.signum() <= 0) {
            throw new IllegalArgumentException("Order has no payable amount");
        }
        if (clientAmount == null || clientAmount.setScale(2, RoundingMode.HALF_UP).compareTo(payableAmount) != 0) {
            throw new IllegalArgumentException("Amount does not match the order total");
        }

        walletService.payForOrder(user, orderId, payableAmount);
        orderService.markOrderPaidByWallet(orderId);
    }
}
