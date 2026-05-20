package com.broandbro.qrapp.dto.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Top-level response from POST /v1/images/generations.
 */
@Data
public class OpenAiImageResponse {

    private Long created;

    private List<ImageData> data;

    @Data
    public static class ImageData {

        /** Base64-encoded PNG image bytes. */
        @JsonProperty("b64_json")
        private String b64Json;

        /** Revised prompt returned by the model (for DALL-E 3). */
        @JsonProperty("revised_prompt")
        private String revisedPrompt;
    }
}

