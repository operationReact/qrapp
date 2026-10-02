package com.broandbro.qrapp.service.ai.impl;

import com.broandbro.qrapp.config.OpenAiProperties;
import com.broandbro.qrapp.dto.openai.OpenAiImageRequest;
import com.broandbro.qrapp.dto.openai.OpenAiImageResponse;
import com.broandbro.qrapp.exception.OpenAiImageGenerationException;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/**
 * OpenAI implementation of {@link ImageGenerationService}.
 * <p>
 * Uses WebClient for non-blocking HTTP, Spring Retry with exponential backoff
 * for transient errors, and structured logging for observability.
 */
@Service("openAiImageGenerationService")
@Slf4j
public class OpenAiImageService implements ImageGenerationService {

    private final WebClient webClient;
    private final OpenAiProperties props;
    private final FoodImagePromptBuilder promptBuilder;

    public OpenAiImageService(
            @Qualifier("openAiWebClient") WebClient webClient,
            OpenAiProperties props,
            FoodImagePromptBuilder promptBuilder) {
        this.webClient = webClient;
        this.props = props;
        this.promptBuilder = promptBuilder;
    }

    @Override
    @Retryable(
            retryFor = {OpenAiImageGenerationException.class},
            maxAttemptsExpression = "#{@openAiProperties.maxRetries}",
            backoff = @Backoff(delay = 2000, multiplier = 2.0, maxDelay = 30000)
    )
    public byte[] generateFoodImage(String menuItemName, String categoryName, Boolean isVeg,
                                    String description, String additionalPrompt) {

        String prompt = promptBuilder.buildFoodImagePrompt(menuItemName, categoryName, isVeg, description, additionalPrompt);
        return generateImageInternal(prompt, menuItemName, props.getImageSize());
    }

    @Override
    @Retryable(
            retryFor = {OpenAiImageGenerationException.class},
            maxAttemptsExpression = "#{@openAiProperties.maxRetries}",
            backoff = @Backoff(delay = 2000, multiplier = 2.0, maxDelay = 30000)
    )
    public byte[] generateImageFromPrompt(String prompt, String size) {
        if (prompt == null || prompt.isBlank()) {
            throw new OpenAiImageGenerationException("Image prompt must not be blank");
        }
        return generateImageInternal(prompt, "custom image", size);
    }

    private byte[] generateImageInternal(String prompt, String subject, String size) {
        log.info("[OpenAI] Starting image generation for '{}' (category={}) | model={} | prompt={}",
                subject, "custom", props.getImageModel(), prompt);

        // gpt-image-1 always returns b64_json and does NOT accept response_format.
        // dall-e-2 / dall-e-3 require response_format="b64_json" to get base64 back.
        boolean isGptImage = props.getImageModel() != null && props.getImageModel().startsWith("gpt-image");

        OpenAiImageRequest request = OpenAiImageRequest.builder()
                .model(props.getImageModel())
                .prompt(prompt)
                .n(1)
                .size(size == null || size.isBlank() ? props.getImageSize() : size)
                .quality(isGptImage ? props.getImageQuality() : null) // "low" for gpt-image-1
                .responseFormat(isGptImage ? null : "b64_json")
                .build();

        log.info("[OpenAI] Request → model={} quality={} size={}",
                props.getImageModel(), props.getImageQuality(), request.getSize());

        Instant start = Instant.now();

        try {
            OpenAiImageResponse response = webClient
                    .post()
                    .uri("/images/generations")
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError(), clientResponse ->
                            clientResponse.bodyToMono(String.class).map(body -> {
                                log.error("[OpenAI] Client error {}: {}", clientResponse.statusCode(), body);
                                return new OpenAiImageGenerationException(
                                        "OpenAI client error " + clientResponse.statusCode() + ": " + body);
                            }))
                    .onStatus(status -> status.is5xxServerError(), clientResponse ->
                            clientResponse.bodyToMono(String.class).map(body -> {
                                log.error("[OpenAI] Server error {}: {}", clientResponse.statusCode(), body);
                                return new OpenAiImageGenerationException(
                                        "OpenAI server error " + clientResponse.statusCode() + ": " + body);
                            }))
                    .bodyToMono(OpenAiImageResponse.class)
                    .block(Duration.ofSeconds(props.getReadTimeoutSeconds()));

            long latencyMs = Duration.between(start, Instant.now()).toMillis();
            log.info("[OpenAI] Image generated for '{}' in {}ms", subject, latencyMs);

            if (response != null && response.getUsage() != null) {
                OpenAiImageResponse.Usage u = response.getUsage();
                log.info("[OpenAI] Tokens used – total={} (input={} output={}) for '{}'",
                        u.getTotalTokens(), u.getInputTokens(), u.getOutputTokens(), subject);
            }

            return decodeBase64Image(response, subject);

        } catch (OpenAiImageGenerationException e) {
            throw e;
        } catch (WebClientResponseException e) {
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("[OpenAI] Rate limit hit for '{}'. Will retry.", subject);
                throw new OpenAiImageGenerationException("OpenAI rate limit exceeded", e);
            }
            log.error("[OpenAI] HTTP error for '{}': {}", subject, e.getMessage());
            throw new OpenAiImageGenerationException("OpenAI HTTP error: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[OpenAI] Unexpected error for '{}': {}", subject, e.getMessage(), e);
            throw new OpenAiImageGenerationException("Unexpected error calling OpenAI: " + e.getMessage(), e);
        }
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    private byte[] decodeBase64Image(OpenAiImageResponse response, String menuItemName) {
        if (response == null || response.getData() == null || response.getData().isEmpty()) {
            throw new OpenAiImageGenerationException(
                    "OpenAI returned empty response for '" + menuItemName + "'");
        }

        List<OpenAiImageResponse.ImageData> data = response.getData();
        String b64 = data.get(0).getB64Json();

        if (b64 == null || b64.isBlank()) {
            throw new OpenAiImageGenerationException(
                    "OpenAI returned null/empty b64_json for '" + menuItemName + "'");
        }

        try {
            byte[] imageBytes = Base64.getDecoder().decode(b64);
            log.debug("[OpenAI] Decoded {} KB for '{}'", imageBytes.length / 1024, menuItemName);
            return imageBytes;
        } catch (IllegalArgumentException e) {
            throw new OpenAiImageGenerationException(
                    "Failed to decode base64 image for '" + menuItemName + "'", e);
        }
    }
}
