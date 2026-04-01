package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import com.broandbro.qrapp.config.RazorpayProperties;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.http.HttpClient;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    private final OrderRepository orderRepo;
    private final Environment env;
    private final RazorpayProperties razorpayProperties;

    @PostConstruct
    private void postConstruct() {
        String[] profiles = env.getActiveProfiles();
        String prof = profiles.length == 0 ? "(none)" : String.join(",", profiles);
        String key = razorpayProperties.getKey();
        String secret = razorpayProperties.getSecret();
        String maskedKey = (key == null || key.isBlank()) ? "<not-set>" : (key.length() > 8 ? key.substring(0, 6) + "..." : key);
        boolean secretSet = !(secret == null || secret.isBlank());
        log.info("PaymentService initialized. activeProfiles={} razorpay.key={} razorpay.secretSet={}", prof, maskedKey, secretSet);
    }

    public Map<String, Object> createRazorpayOrder(Long orderId, int amount) {
        Map<String, Object> result = new HashMap<>();

        String key = razorpayProperties.getKey();
        String secret = razorpayProperties.getSecret();

        // If credentials are present, attempt to create a real Razorpay order via their API
        if (key != null && !key.isBlank() && secret != null && !secret.isBlank()) {
            try {
                String jsonBody = String.format("{\"amount\":%d,\"currency\":\"INR\",\"receipt\":\"order_%d\",\"payment_capture\":1}", amount, orderId);
                String auth = Base64.getEncoder().encodeToString((key + ":" + secret).getBytes(StandardCharsets.UTF_8));

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.razorpay.com/v1/orders"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Basic " + auth)
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<String> resp = HTTP_CLIENT.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                    ObjectMapper om = new ObjectMapper();
                    JsonNode node = om.readTree(resp.body());
                    String rzpId = node.has("id") ? node.get("id").asText() : null;

                    Order order = orderRepo.findById(orderId).orElseThrow();
                    order.setRazorpayOrderId(rzpId);
                    orderRepo.save(order);

                    result.put("rzpOrderId", rzpId);
                    result.put("amount", amount);
                    result.put("currency", "INR");
                    result.put("key", key);
                    result.put("secretSet", true);
                    return result;
                } else {
                    log.warn("Razorpay order creation failed status={} body={}", resp.statusCode(), resp.body());
                    throw new RuntimeException("Razorpay order creation failed: status=" + resp.statusCode() + " body=" + resp.body());
                }
            } catch (Exception e) {
                log.error("Error creating Razorpay order", e);
                throw new RuntimeException("Error creating Razorpay order: " + e.getMessage(), e);
            }
        }

        // If keys are not present, fall back to mock behavior for local/dev without credentials
        String generatedRzpOrderId = "mock_rzp_" + UUID.randomUUID();

        Order order = orderRepo.findById(orderId).orElseThrow();
        order.setRazorpayOrderId(generatedRzpOrderId);
        orderRepo.save(order);

        result.put("rzpOrderId", generatedRzpOrderId);
        result.put("amount", amount);
        result.put("currency", "INR");
        result.put("key", (key == null || key.isBlank()) ? "" : key);
        result.put("secretSet", !(secret == null || secret.isBlank()));
        return result;
    }
}