package com.broandbro.qrapp.dto.happiness;

import jakarta.validation.constraints.Size;

public record HallOfHappinessPhotoUpdateRequest(
        @Size(max = 240) String caption,
        Integer displayOrder,
        @Size(max = 160) String eventLabel,
        @Size(max = 500) String description,
        Boolean global,
        Long locationId
) {
}
