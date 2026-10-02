package com.broandbro.qrapp.campaign.service;

import com.broandbro.qrapp.campaign.entity.HomeCampaign;
import com.broandbro.qrapp.campaign.repository.HomeCampaignRepository;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.OpenAiImageGenerationException;
import com.broandbro.qrapp.prompt.CampaignImagePromptBuilder;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.IntStream;

/**
 * Orchestrates AI image generation for Home campaigns (hero billboards).
 *
 * <p>Unlike MenuItem generation (which is async), campaign generation is
 * synchronous so the admin can preview before accepting.
 *
 * <p>Flow:
 * <ol>
 *   <li>Admin provides creativeDirection (optional)</li>
 *   <li>Generate 1 image option synchronously</li>
 *   <li>Return URL + prompt for preview</li>
 *   <li>Admin clicks "Use This Image" or "Regenerate"</li>
 *   <li>Apply method updates campaign + deletes old image</li>
 * </ol>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CampaignImageGenerationService {

    private final HomeCampaignRepository campaignRepository;
    private final ImageGenerationService imageGenerationService;
    private final ImageStorageService imageStorageService;
    private final CampaignImagePromptBuilder promptBuilder;
    private final LocationAccessService locationAccessService;
    private final Executor imageGenerationExecutor;

    /**
     * Synchronously generates a single campaign hero image for preview.
     * Returns a list with one URL for consistency with the frontend API pattern.
     *
     * @param campaignId        ID of the campaign
     * @param creativeDirection Optional admin direction to refine the image
     * @param actor            User requesting generation (for auth)
     * @return List with one generated image URL
     * @throws OpenAiImageGenerationException on generation/storage failure
     * @throws org.springframework.security.access.AccessDeniedException if auth fails
     */
    public List<String> generateImageOptions(Long campaignId, String creativeDirection, User actor) {
        log.info("[CampaignImgGen] Generation requested for campaignId={} hasCreativeDirection={}", 
                 campaignId, creativeDirection != null && !creativeDirection.isBlank());

        // Load campaign and validate location access
        HomeCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));

        // Validate authorization
        if (campaign.getLocation() != null) {
            locationAccessService.requireLocationAccess(actor, campaign.getLocation().getId());
        } else {
            // Global campaign – only SUPER_ADMIN
            locationAccessService.requireSuperAdmin(actor);
        }

        // Build prompt
        String prompt = promptBuilder.buildCampaignHeroPrompt(
                campaign.getTitle(),
                campaign.getBadge(),
                null, // categoryName (not applicable for campaigns)
                creativeDirection
        );

        log.info("[CampaignImgGen] Calling AI provider for campaignId={}", campaignId);

        try {
            // Generate image bytes
            byte[] imageBytes = imageGenerationService.generateFoodImage(
                    campaign.getTitle(),
                    campaign.getBadge(),
                    null // not a veg/non-veg decision
            );

            log.info("[CampaignImgGen] AI image received ({} KB). Uploading to storage...", imageBytes.length / 1024);

            // Upload to S3
            String folder = buildStorageFolder(campaign);
            String imageUrl = imageStorageService.uploadImage(imageBytes, folder, "image/jpeg");

            log.info("[CampaignImgGen] SUCCESS for campaignId={}. URL={}", campaignId, imageUrl);

            return List.of(imageUrl);

        } catch (OpenAiImageGenerationException e) {
            log.error("[CampaignImgGen] AI generation failed for campaignId={}: {}", campaignId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("[CampaignImgGen] Unexpected error for campaignId={}: {}", campaignId, e.getMessage(), e);
            throw new OpenAiImageGenerationException("Campaign image generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Applies a previously generated image URL to the campaign,
     * replacing the existing image.
     *
     * @param campaignId        ID of the campaign
     * @param selectedUrl       The generated image URL to apply
     * @param allGeneratedUrls  All generated URLs (to clean up unselected ones)
     * @param actor            User requesting apply (for auth)
     * @throws org.springframework.security.access.AccessDeniedException if auth fails
     */
    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public void applyGeneratedImage(Long campaignId, String selectedUrl, List<String> allGeneratedUrls, User actor) {
        log.info("[CampaignImgGen] Applying AI image for campaignId={} url={}", campaignId, selectedUrl);

        // Load campaign and validate authorization
        HomeCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));

        // Validate authorization
        if (campaign.getLocation() != null) {
            locationAccessService.requireLocationAccess(actor, campaign.getLocation().getId());
        } else {
            locationAccessService.requireSuperAdmin(actor);
        }

        // Delete old image before applying new one (but keep it safe – best-effort)
        String oldImageUrl = campaign.getImageUrl();
        if (oldImageUrl != null && !oldImageUrl.isBlank()) {
            try {
                imageStorageService.deleteImageByUrl(oldImageUrl);
                log.info("[CampaignImgGen] Deleted old image for campaignId={} url={}", campaignId, oldImageUrl);
            } catch (Exception e) {
                log.warn("[CampaignImgGen] Failed to delete old image for campaignId={}: {}", campaignId, e.getMessage());
                // Continue anyway – new image is already uploaded
            }
        }

        // Update campaign with new image
        campaign.setImageUrl(selectedUrl);
        campaignRepository.save(campaign);

        log.info("[CampaignImgGen] Applied AI image for campaignId={}. Cache invalidated.", campaignId);

        // Clean up unselected options (best-effort)
        if (allGeneratedUrls != null) {
            allGeneratedUrls.stream()
                    .filter(url -> url != null && !url.equals(selectedUrl))
                    .forEach(url -> {
                        try {
                            imageStorageService.deleteImageByUrl(url);
                            log.debug("[CampaignImgGen] Deleted unselected option for campaignId={} url={}", campaignId, url);
                        } catch (Exception e) {
                            log.warn("[CampaignImgGen] Failed to delete unselected option url={}: {}", url, e.getMessage());
                        }
                    });
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String buildStorageFolder(HomeCampaign campaign) {
        if (campaign.getLocation() != null) {
            return "campaigns/hero/" + campaign.getLocation().getId() + "/" + campaign.getId();
        } else {
            // Global campaign
            return "campaigns/hero/global/" + campaign.getId();
        }
    }
}
