package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManualRefundCompleteRequest(
        @NotBlank @Size(max = 120) String reference,
        /** Required only for a Razorpay refund created on the dashboard, which has no BroBro refund key. */
        boolean acknowledgeDashboardRefund
) {
}
