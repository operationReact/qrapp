package com.broandbro.qrapp.dto.openai;

import lombok.Builder;
import lombok.Data;

/**
 * Request body for POST /v1/images/generations.
 * Matches the exact fields accepted by gpt-image-1:
 *   model, prompt, n, size
 */
@Data
@Builder
public class OpenAiImageRequest {

    private String model;
    private String prompt;
    private int n;
    private String size;
}
