package com.broandbro.qrapp.dto.openai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Response from POST /v1/images/generations (gpt-image-1).
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OpenAiImageResponse {

    private Long created;
    private List<ImageData> data;
    private Usage usage;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ImageData {

        @JsonProperty("b64_json")
        private String b64Json;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Usage {

        @JsonProperty("total_tokens")
        private Integer totalTokens;

        @JsonProperty("input_tokens")
        private Integer inputTokens;

        @JsonProperty("output_tokens")
        private Integer outputTokens;

        @JsonProperty("input_tokens_details")
        private InputTokenDetails inputTokensDetails;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InputTokenDetails {

        @JsonProperty("text_tokens")
        private Integer textTokens;

        @JsonProperty("image_tokens")
        private Integer imageTokens;
    }
}
