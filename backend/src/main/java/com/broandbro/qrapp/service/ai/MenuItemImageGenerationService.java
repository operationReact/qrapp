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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.IntStream;

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
@Slf4j
public class MenuItemImageGenerationService {

    private final MenuRepository menuRepository;
    private final ImageGenerationService imageGenerationService;
    private final ImageStorageService imageStorageService;
    private final FoodImagePromptBuilder promptBuilder;
    private final Executor imageGenerationExecutor;

    public MenuItemImageGenerationService(
            MenuRepository menuRepository,
            ImageGenerationService imageGenerationService,
            ImageStorageService imageStorageService,
            FoodImagePromptBuilder promptBuilder,
            @Qualifier("imageGenerationExecutor") Executor imageGenerationExecutor) {
        this.menuRepository = menuRepository;
        this.imageGenerationService = imageGenerationService;
        this.imageStorageService = imageStorageService;
        this.promptBuilder = promptBuilder;
        this.imageGenerationExecutor = imageGenerationExecutor;
    }

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
        if (!force
                && ImageGenerationStatus.COMPLETED.equals(menuItem.getImageGenerationStatus())
                && menuItem.getImageUrl() != null
                && !menuItem.getImageUrl().isBlank()) {
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
                && menuItem.getImageUrl() != null
                && !menuItem.getImageUrl().isBlank()
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

            String imageUrl = imageStorageService.uploadMenuItemImage(imageBytes, menuItemId, menuItem.getLocation().getId());

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
    // Multi-option generation (synchronous – caller awaits result)
    // -------------------------------------------------------------------------

    public List<String> generateImageOptions(Long menuItemId, int count) {
        return generateImageOptions(menuItemId, count, null, null);
    }    /**
     * Concurrently generates up to {@code count} AI image options (max 3) for the given menu item.
     * All image generation + S3 upload tasks run in parallel on the {@code imageGenerationExecutor}
     * thread pool, so total wall-clock time ≈ single generation time instead of N × single time.
     *
     * <p>DB load is done first (short, outside any long transaction), then HTTP calls happen
     * concurrently without holding a DB connection.
     *
     * @param menuItemId           ID of the MenuItem
     * @param count                Number of images to generate (capped at 3)
     * @param additionalPrompt     Optional free-text hint from the admin to refine the image
     * @param previousGeneratedUrls Previous round's URLs to delete before generating new ones
     * @return List of successfully uploaded image URLs (may be shorter than count on partial failure)
     */
    public List<String> generateImageOptions(Long menuItemId, int count,
                                             String additionalPrompt,
                                             List<String> previousGeneratedUrls) {
        int cappedCount = Math.min(count, 1);

        // Delete previous round's images before generating new ones (best-effort)
        if (previousGeneratedUrls != null && !previousGeneratedUrls.isEmpty()) {
            previousGeneratedUrls.stream()
                    .filter(url -> url != null && !url.isBlank())
                    .forEach(url -> {
                        try {
                            imageStorageService.deleteImageByUrl(url);
                            log.info("[ImgGen] Deleted previous-round image before retry: {}", url);
                        } catch (Exception e) {
                            log.warn("[ImgGen] Could not delete previous-round image {}: {}", url, e.getMessage());
                        }
                    });
        }

        // Load entity fields quickly — no transaction held during the long HTTP calls
        final String itemName;
        final String categoryName;
        final Boolean isVeg;
        final String description;
        final Long locationId;
        {
            MenuItem menuItem = menuRepository.findById(menuItemId)
                    .orElseThrow(() -> new IllegalArgumentException("MenuItem not found: " + menuItemId));
            itemName     = menuItem.getName();
            categoryName = menuItem.getCategory() != null ? menuItem.getCategory().getName() : null;
            isVeg        = menuItem.getIsVeg();
            description  = menuItem.getDescription();
            locationId   = menuItem.getLocation().getId();
        }

        // Fire all generation tasks in parallel on the dedicated thread pool
        List<CompletableFuture<String>> futures = IntStream.range(0, cappedCount)
                .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
                    log.info("[ImgGen] ▶ Starting parallel option {}/{} for menuItemId={}", i + 1, cappedCount, menuItemId);
                    byte[] imageBytes = imageGenerationService.generateFoodImage(
                            itemName, categoryName, isVeg, description, additionalPrompt);
                    String url = imageStorageService.uploadMenuItemImage(imageBytes, menuItemId, locationId);
                    log.info("[ImgGen] ✔ Completed option {}/{} for menuItemId={} url={}", i + 1, cappedCount, menuItemId, url);
                    return url;
                }, imageGenerationExecutor)
                .exceptionally(ex -> {
                    log.error("[ImgGen] ✘ Failed option {}/{} for menuItemId={}: {}", i + 1, cappedCount, menuItemId, ex.getMessage());
                    throw new java.util.concurrent.CompletionException(ex);
                }))
                .toList();

        // Wait for all to complete, then collect non-null results
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        List<String> generatedUrls = futures.stream()
                .map(CompletableFuture::join)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        if (generatedUrls.isEmpty()) {
            throw new OpenAiImageGenerationException(
                    "No image was generated for menuItemId=" + menuItemId);
        }

        return generatedUrls;
    }

    /**
     * Applies a previously generated image URL to the menu item's imageUrl field,
     * then deletes the other unselected images from S3 to save storage.
     *
     * Uses a direct JPQL UPDATE to bypass Hibernate dirty-check/session quirks and
     * guarantee the column is written in all cases.
     */
    @Transactional
    public void applyGeneratedImage(Long menuItemId, String selectedUrl, java.util.List<String> allGeneratedUrls) {
        // Verify item exists
        if (!menuRepository.existsById(menuItemId)) {
            throw new IllegalArgumentException("MenuItem not found: " + menuItemId);
        }

        // Direct SQL UPDATE — bypasses Hibernate entity cache / lazy-proxy issues
        MenuItem item = menuRepository.findById(menuItemId)
                .orElseThrow(() -> new IllegalArgumentException("MenuItem not found: " + menuItemId));
        int updated = menuRepository.applyAiImageUrl(
                menuItemId, item.getLocation().getId(), selectedUrl,
                ImageGenerationStatus.COMPLETED, Instant.now());

        if (updated == 0) {
            throw new IllegalStateException("applyAiImageUrl updated 0 rows for menuItemId=" + menuItemId);
        }

        log.info("[ImgGen] Applied AI image for menuItemId={} url={} (rows updated={})", menuItemId, selectedUrl, updated);

        // Delete unselected images from S3 (best-effort)
        if (allGeneratedUrls != null) {
            allGeneratedUrls.stream()
                    .filter(url -> url != null && !url.equals(selectedUrl))
                    .forEach(url -> {
                        try {
                            imageStorageService.deleteImageByUrl(url);
                            log.info("[ImgGen] Deleted unselected option for menuItemId={} url={}", menuItemId, url);
                        } catch (Exception e) {
                            log.warn("[ImgGen] Failed to delete unselected option url={}: {}", url, e.getMessage());
                        }
                    });
        }
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
