package com.broandbro.qrapp.dto.openai;

import lombok.Data;

import java.util.List;

/**
 * Request body for POST /admin/menu-items/{id}/apply-generated-image.
 */
@Data
public class ApplyGeneratedImageRequest {
    /** URL of the selected image option to apply. */
    private String imageUrl;

    /**
     * All URLs that were generated in this session.
     * The backend will delete any URL in this list that is NOT the selected {@link #imageUrl}.
     */
    private List<String> allGeneratedUrls;
}

