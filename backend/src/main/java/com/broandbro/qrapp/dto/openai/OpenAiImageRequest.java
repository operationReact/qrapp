package com.broandbro.qrapp.dto.openai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Request body for POST /v1/images/generations.
 * Supports both gpt-image-1 and dall-e-2.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OpenAiImageRequest {

    private String model;
    private String prompt;
    private int n;
    private String size;

    /**
     * Image quality: "low" | "medium" | "high".
     * Only supported by gpt-image-1. "low" is cheapest.
     */
    private String quality;

    /** Required for dall-e-2 to return base64. Set to "b64_json". */
    @JsonProperty("response_format")
    private String responseFormat;
}
