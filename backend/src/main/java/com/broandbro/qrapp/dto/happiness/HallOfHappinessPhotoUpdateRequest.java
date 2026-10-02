package com.broandbro.qrapp.dto.happiness;

import jakarta.validation.constraints.Size;

public record HallOfHappinessPhotoUpdateRequest(
        @Size(max = 240) String caption,
        Integer displayOrder,
        @Size(max = 160) String eventLabel,
        @Size(max = 500) String description,
        Boolean global,
        Long locationId,
        /** Base64-encoded image data for replacement (multipart/form-data: use file instead) */
        String imageBase64,
        /** Original filename for reference (when using imageBase64) */
        String fileName
) {
}
