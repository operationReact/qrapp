package com.broandbro.qrapp.dto.openai;

import lombok.Data;

import java.util.List;

/**
 * Request body for POST /admin/menu-items/{id}/generate-image-options.
 */
@Data
public class GenerateImageOptionsRequest {

    /** Number of images to generate (1–3, defaults to 3). */
    private int count = 3;

    /**
     * Optional free-text hint from the admin to refine the generated image.
     * E.g. "add steam, more golden colour, show side garnish".
     * Appended to the base prompt at high priority.
     */
    private String additionalPrompt;

    /**
     * URLs from a previous generation round that should be deleted from S3
     * because the admin is retrying and no longer needs them.
     */
    private List<String> previousGeneratedUrls;
}
