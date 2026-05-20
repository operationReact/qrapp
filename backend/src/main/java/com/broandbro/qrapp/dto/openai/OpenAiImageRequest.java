package com.broandbro.qrapp.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Request body for POST /v1/images/generations.
 */
@Data
@Builder
public class OpenAiImageRequest {

    /** Model to use (e.g. gpt-image-1, dall-e-3). */
    private String model;

    /** Text prompt describing the desired image. */
    private String prompt;

    /** Image dimensions (e.g. 1024x1024). */
    private String size;

    /** Number of images to generate (always 1 for our use case). */
    private int n;

    /** Response format – request base64-encoded image data. */
    @JsonProperty("response_format")
    @Builder.Default
    private String responseFormat = "b64_json";
}

