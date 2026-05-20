package com.broandbro.qrapp.service.ai;

import com.broandbro.qrapp.enums.ImageGenerationStatus;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.exception.ImageUploadException;
import com.broandbro.qrapp.exception.OpenAiImageGenerationException;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

/**
 * Orchestrates the full AI image generation pipeline for a MenuItem.
 *
 * <p>All methods run on the {@code imageGenerationExecutor} thread pool so
 * the HTTP request that triggered generation returns immediately.
 *
 * <p>Flow:
 * <ol>
 *   <li>Load MenuItem from DB</li>
 *   <li>Optionally skip if already completed and {@code force=false}</li>
 *   <li>Mark status = PROCESSING</li>
 *   <li>Delegate to {@link ImageGenerationService} → raw bytes</li>
 *   <li>Upload bytes via {@link ImageStorageService} → public URL</li>
 *   <li>Persist URL, status = COMPLETED</li>
 *   <li>On any error → status = FAILED, store error message</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MenuItemImageGenerationService {

    private final MenuRepository menuRepository;
    private final ImageGenerationService imageGenerationService;
    private final ImageStorageService imageStorageService;
    private final FoodImagePromptBuilder promptBuilder;

    /**
     * Asynchronously generates and stores an AI image for the given MenuItem.
     * Skips generation if status is already COMPLETED and {@code force=false}.
     *
     * @param menuItemId  ID of the MenuItem to process
     * @param force       When {@code true}, regenerates even if already COMPLETED
     */
    @Async("imageGenerationExecutor")
    @Transactional
    public void generateImageForMenuItem(Long menuItemId, boolean force) {

        log.info("[ImgGen] Generation requested for menuItemId={} force={}", menuItemId, force);

        MenuItem menuItem = menuRepository.findById(menuItemId).orElse(null);
        if (menuItem == null) {
            log.warn("[ImgGen] MenuItem not found for id={}", menuItemId);
            return;
        }

        // Duplicate prevention
        if (!force && ImageGenerationStatus.COMPLETED.equals(menuItem.getImageGenerationStatus())) {
            log.info("[ImgGen] Skipping – already COMPLETED for menuItemId={}. Use force=true to regenerate.", menuItemId);
            return;
        }

        // If already processing, avoid race condition
        if (ImageGenerationStatus.PROCESSING.equals(menuItem.getImageGenerationStatus())) {
            log.info("[ImgGen] Already PROCESSING for menuItemId={}, skipping duplicate trigger.", menuItemId);
            return;
        }

        String categoryName = menuItem.getCategory() != null ? menuItem.getCategory().getName() : null;
        String prompt = promptBuilder.buildFoodImagePrompt(menuItem.getName(), categoryName, menuItem.getIsVeg());
        String promptHash = promptBuilder.computePromptHash(prompt);

        // If prompt has not changed and image already exists, skip
        if (!force
                && ImageGenerationStatus.COMPLETED.equals(menuItem.getImageGenerationStatus())
                && Objects.equals(promptHash, menuItem.getImagePromptHash())) {
            log.info("[ImgGen] Prompt unchanged and image already exists for menuItemId={}. Skipping.", menuItemId);
            return;
        }

        // Mark PROCESSING
        menuItem.setImageGenerationStatus(ImageGenerationStatus.PROCESSING);
        menuItem.setImageGenerationRequestedAt(Instant.now());
        menuItem.setImageGenerationError(null);
        menuItem.setImagePrompt(prompt);
        menuItem.setImagePromptHash(promptHash);
        menuRepository.save(menuItem);

        try {
            log.info("[ImgGen] Calling AI provider '{}' for menuItemId={}", imageGenerationService.getProviderName(), menuItemId);

            byte[] imageBytes = imageGenerationService.generateFoodImage(
                    menuItem.getName(), categoryName, menuItem.getIsVeg());

            log.info("[ImgGen] AI image received ({} KB). Uploading to storage...", imageBytes.length / 1024);

            String imageUrl = imageStorageService.uploadMenuItemImage(imageBytes, menuItemId);

            menuItem.setImageUrl(imageUrl);
            menuItem.setAiGeneratedImage(true);
            menuItem.setImageGenerationStatus(ImageGenerationStatus.COMPLETED);
            menuItem.setImageGenerationCompletedAt(Instant.now());
            menuItem.setImageGenerationError(null);
            menuRepository.save(menuItem);

            log.info("[ImgGen] SUCCESS for menuItemId={}. URL={}", menuItemId, imageUrl);

        } catch (OpenAiImageGenerationException e) {
            handleFailure(menuItem, "AI generation failed: " + e.getMessage());
        } catch (ImageUploadException e) {
            handleFailure(menuItem, "S3 upload failed: " + e.getMessage());
        } catch (Exception e) {
            handleFailure(menuItem, "Unexpected error: " + e.getMessage());
            log.error("[ImgGen] Unexpected error for menuItemId={}", menuItemId, e);
        }
    }

    /**
     * Convenience overload – triggers generation without force flag.
     */
    @Async("imageGenerationExecutor")
    public void generateImageForMenuItem(Long menuItemId) {
        generateImageForMenuItem(menuItemId, false);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void handleFailure(MenuItem menuItem, String errorMessage) {
        log.error("[ImgGen] FAILED for menuItemId={}: {}", menuItem.getId(), errorMessage);
        menuItem.setImageGenerationStatus(ImageGenerationStatus.FAILED);
        menuItem.setImageGenerationError(truncate(errorMessage, 500));
        menuItem.setImageGenerationCompletedAt(Instant.now());
        menuRepository.save(menuItem);
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() > maxLen ? s.substring(0, maxLen) : s;
    }
}

