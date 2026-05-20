package com.broandbro.qrapp.dto.openai;

import com.broandbro.qrapp.enums.ImageGenerationStatus;
import lombok.Builder;
import lombok.Data;

/**
 * API response for GET /admin/menu-items/{id}/image-status.
 */
@Data
@Builder
public class ImageGenerationStatusResponse {

    private Long menuItemId;
    private String menuItemName;
    private ImageGenerationStatus status;
    private String imageUrl;
    private String error;
    private String imagePrompt;
    private Boolean aiGeneratedImage;
}

