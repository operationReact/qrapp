package com.broandbro.qrapp.dto.openai;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Request body for campaign/category image generation endpoints.
 * Contains optional creative direction to refine the generated image.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageGenerationRequest {
    
    /**
     * Optional creative direction hint from admin.
     * Example: "warm golden lighting, luxurious presentation"
     */
    private String creativeDirection;
    
    /**
     * Previously generated URLs to clean up if not selected.
     * Allows frontend to pass back the full list for cleanup.
     */
    private java.util.List<String> previousGeneratedUrls;
}
