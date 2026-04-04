package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final OrderRepository orderRepo;
    private final RazorpayService razorpayService;

    @PostConstruct
    private void postConstruct() {
        String key = razorpayService.getKeyId();
        String maskedKey = (key == null || key.isBlank()) ? "<not-set>" : (key.length() > 8 ? key.substring(0, 6) + "..." : key);
        log.info("PaymentService initialized. razorpay.key={} razorpay.enabled={}", maskedKey, razorpayService.isEnabled());
    }

    public Map<String, Object> createRazorpayOrder(Long orderId, int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        String razorpayOrderId = razorpayService.createOrder((long) amount, "INR", "order_" + orderId);

        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setRazorpayOrderId(razorpayOrderId);
        orderRepo.save(order);

        Map<String, Object> result = new HashMap<>();
        result.put("rzpOrderId", razorpayOrderId);
        result.put("amount", amount);
        result.put("currency", "INR");
        result.put("key", razorpayService.getKeyId());
        result.put("secretSet", razorpayService.isEnabled());
        return result;
    }
}