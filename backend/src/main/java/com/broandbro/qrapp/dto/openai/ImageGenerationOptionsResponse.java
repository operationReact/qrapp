package com.broandbro.qrapp.dto.openai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * API response for POST /admin/menu-items/{id}/generate-image-options.
 * Returns a list of generated image URLs for the admin to choose from.
 */
@Data
@Builder
public class ImageGenerationOptionsResponse {

    private Long menuItemId;
    private String menuItemName;
    /** Ordered list of generated image URLs (max 3). */
    private List<String> imageUrls;
    private String imagePrompt;
}

