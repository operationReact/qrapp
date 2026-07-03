package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminOrderUpdateRequest {
    private String status;

    @Size(max = 1000)
    private String adminNote;

    /** Optional: "PAID", "PENDING", "FAILED" — lets admin manually record cash payment */
    private String paymentStatus;
}

