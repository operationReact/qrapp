package com.broandbro.qrapp.dto.happiness;

import jakarta.validation.constraints.Size;

public record HallOfHappinessPhotoUpdateRequest(
        @Size(max = 240) String caption,
        Integer displayOrder
) {
}
