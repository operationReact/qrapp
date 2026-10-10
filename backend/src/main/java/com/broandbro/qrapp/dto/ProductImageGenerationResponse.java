package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.ProductImageGenerationStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductImageGenerationResponse {
    private Long sessionId;
    private Long productId;
    private ProductImageGenerationStatus status;
    private String sourceUrl;
    private String generatedUrl;
    private String provider;
    private String model;
    private String error;
    private Long sourceBytes;
    private Integer sourceWidth;
    private Integer sourceHeight;
    private Long generatedBytes;
    private Integer generatedWidth;
    private Integer generatedHeight;
}
