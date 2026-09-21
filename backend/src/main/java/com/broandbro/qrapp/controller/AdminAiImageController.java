package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.openai.ApplyGeneratedImageRequest;
import com.broandbro.qrapp.dto.openai.GenerateImageOptionsRequest;
import com.broandbro.qrapp.dto.openai.ImageGenerationOptionsResponse;
import com.broandbro.qrapp.dto.openai.ImageGenerationStatusResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.exception.MenuItemNotFoundException;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.ai.MenuItemImageGenerationService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-only endpoints for AI image generation management.
 *
 * <p>All endpoints require ROLE_ADMIN (enforced at URL level in SecurityConfig
 * and additionally at method level with {@code @PreAuthorize}).
 */
@RestController
@RequestMapping("/admin/menu-items")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin – AI Image Generation", description = "Manage AI-generated food images for menu items")
public class AdminAiImageController {

    private final MenuItemImageGenerationService imageGenerationService;
    private final MenuRepository menuRepository;
    private final FoodImagePromptBuilder promptBuilder;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    /**
     * Manually trigger AI image generation for a menu item.
     * If an image already exists and {@code force=true} is not set, generation is skipped.
     */
    @PostMapping("/{id}/generate-image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Trigger AI image generation for a menu item")
    public ResponseEntity<String> generateImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestParam(defaultValue = "false") boolean force,
            java.security.Principal principal) {

        MenuItem menuItem = findMenuItemOrThrow(id, locationId, principal);
        log.info("[AdminAiImageController] generate-image requested for id={} force={}", id, force);

        imageGenerationService.generateImageForMenuItem(id, force);

        return ResponseEntity.accepted()
                .body("Image generation started for menu item '" + menuItem.getName() + "'. Check status endpoint.");
    }

    /**
     * Get current image generation status, URL, and error details.
     */
    @GetMapping("/{id}/image-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Get AI image generation status for a menu item")
    public ResponseEntity<ImageGenerationStatusResponse> getImageStatus(
            @PathVariable Long id, @RequestParam Long locationId, java.security.Principal principal) {

        MenuItem menuItem = findMenuItemOrThrow(id, locationId, principal);

        ImageGenerationStatusResponse response = ImageGenerationStatusResponse.builder()
                .menuItemId(menuItem.getId())
                .menuItemName(menuItem.getName())
                .status(menuItem.getImageGenerationStatus())
                .imageUrl(menuItem.getImageUrl())
                .error(menuItem.getImageGenerationError())
                .imagePrompt(menuItem.getImagePrompt())
                .aiGeneratedImage(menuItem.getAiGeneratedImage())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Force regeneration of the AI image (ignores existing status).
     */
    @PostMapping("/{id}/regenerate-image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Force regenerate AI image for a menu item")
    public ResponseEntity<String> regenerateImage(
            @PathVariable Long id, @RequestParam Long locationId, java.security.Principal principal) {

        MenuItem menuItem = findMenuItemOrThrow(id, locationId, principal);
        log.info("[AdminAiImageController] regenerate-image requested for id={}", id);

        imageGenerationService.generateImageForMenuItem(id, true);

        return ResponseEntity.accepted()
                .body("Image regeneration started for menu item '" + menuItem.getName() + "'.");
    }

    /**
     * Synchronously generates up to 3 AI image options for the admin to preview and choose from.
     * Returns a list of uploaded image URLs.
     */
    @PostMapping("/{id}/generate-image-options")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Generate 1 AI image option for a menu item. Supports additionalPrompt to refine.")
    public ResponseEntity<ImageGenerationOptionsResponse> generateImageOptions(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody(required = false) GenerateImageOptionsRequest request,
            java.security.Principal principal) {

        MenuItem menuItem = findMenuItemOrThrow(id, locationId, principal);

        int count = 1; // always 1 for now
        String additionalPrompt = (request != null) ? request.getAdditionalPrompt() : null;
        java.util.List<String> previousUrls = (request != null) ? request.getPreviousGeneratedUrls() : null;

        log.info("[AdminAiImageController] generate-image-options id={} count={} hasExtraPrompt={}",
                id, count, additionalPrompt != null && !additionalPrompt.isBlank());

        java.util.List<String> urls = imageGenerationService.generateImageOptions(id, count, additionalPrompt, previousUrls);

        String categoryName = menuItem.getCategory() != null ? menuItem.getCategory().getName() : null;
        String prompt = promptBuilder.buildFoodImagePrompt(
                menuItem.getName(), categoryName, menuItem.getIsVeg(),
                menuItem.getDescription(), additionalPrompt);

        ImageGenerationOptionsResponse response = ImageGenerationOptionsResponse.builder()
                .menuItemId(menuItem.getId())
                .menuItemName(menuItem.getName())
                .imageUrls(urls)
                .imagePrompt(prompt)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Applies one of the previously generated image options as the menu item's current image.
     */
    @PostMapping("/{id}/apply-generated-image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Caching(evict = {
        @CacheEvict(cacheNames = "menu", allEntries = true),
        @CacheEvict(cacheNames = "menuRecommended", allEntries = true)
    })
    @Operation(summary = "Apply a selected AI-generated image URL to a menu item")
    public ResponseEntity<String> applyGeneratedImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody ApplyGeneratedImageRequest request,
            java.security.Principal principal) {

        MenuItem menuItem = findMenuItemOrThrow(id, locationId, principal);
        log.info("[AdminAiImageController] apply-generated-image for id={} url={}", id, request.getImageUrl());

        imageGenerationService.applyGeneratedImage(id, request.getImageUrl(), request.getAllGeneratedUrls());

        return ResponseEntity.ok("Image applied to menu item '" + menuItem.getName() + "'.");
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private MenuItem findMenuItemOrThrow(Long id, Long locationId, java.security.Principal principal) {
        User user = userService.findByPhone(principal.getName()).orElseThrow();
        locationAccessService.requireLocationAccess(user, locationId);
        return menuRepository.findByIdAndLocationId(id, locationId)
                .orElseThrow(() -> new MenuItemNotFoundException(id));
    }
}
