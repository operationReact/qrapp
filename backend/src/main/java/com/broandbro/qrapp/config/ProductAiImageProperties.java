package com.broandbro.qrapp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "product.ai-image")
@Data
public class ProductAiImageProperties {
    private boolean enabled = false;
    private long maxSourceBytes = 10L * 1024 * 1024;
    private int maxWidth = 4096;
    private int maxHeight = 4096;
    private int timeoutSeconds = 120;
    private int maxGenerationsPerProductPerHour = 5;
    private String promptTemplate = """
            Create a single front-facing package product image for product name "{{productName}}", brand "{{brand}}", variant "{{variant}}".
            Use the supplied reference image as the identity source. Produce a realistic studio render with even lighting,
            accurate package proportions and legible packaging. Show exactly one product, centered, isolated with no extra
            products and no distracting background. Preserve the package design where possible. Return a transparent PNG
            when supported. Do not invent prices, barcodes, logos, regulatory marks, or additional text.
            """;
}
