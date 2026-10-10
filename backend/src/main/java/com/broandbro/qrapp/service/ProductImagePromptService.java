package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.ProductAiImageProperties;
import com.broandbro.qrapp.entity.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
@RequiredArgsConstructor
public class ProductImagePromptService {
    private final ProductAiImageProperties properties;

    public String build(Product product) {
        return properties.getPromptTemplate()
                .replace("{{productName}}", safe(product.getName()))
                .replace("{{brand}}", safe(product.getBrand()))
                .replace("{{variant}}", safe(product.getVariantIdentity()));
    }

    public String hash(String prompt) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(prompt.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte value : digest) result.append(String.format("%02x", value));
            return result.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "not specified" : value.trim();
    }
}
