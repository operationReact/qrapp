package com.broandbro.qrapp.combo.dto;

import com.broandbro.qrapp.enums.ComboStatus;
import jakarta.validation.constraints.NotNull;

public record ComboStatusUpdateRequest(
        @NotNull(message = "Status is required")
        ComboStatus status
) {}

