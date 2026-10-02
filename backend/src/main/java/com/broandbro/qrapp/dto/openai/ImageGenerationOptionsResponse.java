package com.broandbro.qrapp.dto.openai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * API response for POST /admin/{entity}/{id}/generate-image-options.
 * Returns a list of generated image URLs for the admin to choose from.
 * Used for Menu Items, Campaigns, and Categories.
 */
@Data
@Builder
public class ImageGenerationOptionsResponse {

    /** For Menu Items */
    private Long menuItemId;
    private String menuItemName;
    
    /** For Campaigns */
    private Long campaignId;
    
    /** For Categories */
    private Long categoryId;
    
    /** Ordered list of generated image URLs (typically 1 per request). */
    private List<String> imageUrls;
    private String imagePrompt;
}


