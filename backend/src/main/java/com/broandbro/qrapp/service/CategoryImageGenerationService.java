package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.OpenAiImageGenerationException;
import com.broandbro.qrapp.prompt.CategoryImagePromptBuilder;
import com.broandbro.qrapp.prompt.CategoryImageQuality;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Orchestrates AI image generation for categories.
 *
 * <p>Flow:
 * <ol>
 *   <li>Admin provides creativeDirection (optional)</li>
 *   <li>Generate 1 food photograph synchronously</li>
 *   <li>Return URL + prompt for preview</li>
 *   <li>Admin clicks "Use This Image" or "Regenerate"</li>
 *   <li>Apply method updates category + deletes old image</li>
 * </ol>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CategoryImageGenerationService {

    private final CategoryRepository categoryRepository;
    private final ImageGenerationService imageGenerationService;
    private final ImageStorageService imageStorageService;
    private final CategoryImagePromptBuilder promptBuilder;
    private final LocationAccessService locationAccessService;

    /**
     * Synchronously generates a single category food photograph for preview.
     * Returns a list with one URL for consistency with the frontend API pattern.
     *
     * @param locationId        Location ID (for scoping)
     * @param categoryId        ID of the category
     * @param creativeDirection Optional admin direction to refine the image
     * @param actor            User requesting generation (for auth)
     * @return List with one generated image URL
     * @throws OpenAiImageGenerationException on generation/storage failure
     * @throws org.springframework.security.access.AccessDeniedException if auth fails
     */
    public List<String> generateImageOptions(Long locationId, Long categoryId, String creativeDirection, User actor) {
        log.info("[CategoryImgGen] Generation requested for categoryId={} hasCreativeDirection={}", 
                 categoryId, creativeDirection != null && !creativeDirection.isBlank());

        // Load category and validate location/authorization
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(categoryId, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));

        locationAccessService.requireLocationAccess(actor, locationId);

        // Build prompt
        String prompt = promptBuilder.buildCategoryFoodImagePrompt(
                category.getName(),
                category.getDescription(),
                creativeDirection
        );

        log.info("[CategoryImgGen] Calling AI provider for categoryId={}", categoryId);

        try {
            // Generate image bytes
            byte[] imageBytes = imageGenerationService.generateFoodImage(
                    category.getName(),
                    null, // categoryName not applicable (category IS the context)
                    null  // veg/non-veg not applicable
            );

            log.info("[CategoryImgGen] AI image received ({} KB). Uploading to storage...", imageBytes.length / 1024);

            // Upload to S3
            String folder = "categories/" + categoryId;
            String imageUrl = imageStorageService.uploadImage(imageBytes, folder, CategoryImageQuality.detectContentType(imageBytes));

            log.info("[CategoryImgGen] SUCCESS for categoryId={}. URL={}", categoryId, imageUrl);

            return List.of(imageUrl);

        } catch (OpenAiImageGenerationException e) {
            log.error("[CategoryImgGen] AI generation failed for categoryId={}: {}", categoryId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("[CategoryImgGen] Unexpected error for categoryId={}: {}", categoryId, e.getMessage(), e);
            throw new OpenAiImageGenerationException("Category image generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Applies a previously generated image URL to the category,
     * replacing the existing image.
     *
     * @param locationId        Location ID (for scoping)
     * @param categoryId        ID of the category
     * @param selectedUrl       The generated image URL to apply
     * @param allGeneratedUrls  All generated URLs (to clean up unselected ones)
     * @param actor            User requesting apply (for auth)
     * @throws org.springframework.security.access.AccessDeniedException if auth fails
     */
    @Transactional
    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public void applyGeneratedImage(Long locationId, Long categoryId, String selectedUrl, 
                                    List<String> allGeneratedUrls, User actor) {
        log.info("[CategoryImgGen] Applying AI image for categoryId={} url={}", categoryId, selectedUrl);

        // Load category and validate authorization
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(categoryId, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));

        locationAccessService.requireLocationAccess(actor, locationId);

        // Delete old image before applying new one (but keep it safe – best-effort)
        String oldImageUrl = category.getImageUrl();
        if (oldImageUrl != null && !oldImageUrl.isBlank()) {
            try {
                imageStorageService.deleteImageByUrl(oldImageUrl);
                log.info("[CategoryImgGen] Deleted old image for categoryId={} url={}", categoryId, oldImageUrl);
            } catch (Exception e) {
                log.warn("[CategoryImgGen] Failed to delete old image for categoryId={}: {}", categoryId, e.getMessage());
                // Continue anyway – new image is already uploaded
            }
        }

        // Update category with new image
        category.setImageUrl(selectedUrl);
        category.setAiGeneratedImage(true);
        categoryRepository.save(category);

        log.info("[CategoryImgGen] Applied AI image for categoryId={}. Cache invalidated.", categoryId);

        // Clean up unselected options (best-effort)
        if (allGeneratedUrls != null) {
            allGeneratedUrls.stream()
                    .filter(url -> url != null && !url.equals(selectedUrl))
                    .forEach(url -> {
                        try {
                            imageStorageService.deleteImageByUrl(url);
                            log.debug("[CategoryImgGen] Deleted unselected option for categoryId={} url={}", categoryId, url);
                        } catch (Exception e) {
                            log.warn("[CategoryImgGen] Failed to delete unselected option url={}: {}", url, e.getMessage());
                        }
                    });
        }
    }
}

