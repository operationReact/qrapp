package com.broandbro.qrapp.dto.partyorder;

import com.broandbro.qrapp.enums.PartyOrderStatus;
import jakarta.validation.constraints.NotNull;

public record PartyOrderStatusUpdateRequest(

        @NotNull(message = "Status is required")
        PartyOrderStatus status
) {}

