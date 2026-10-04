package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreatePreOrderRequest {

    @NotBlank
    private String phone;

    private PaymentMethod paymentMethod;

    private Long locationId;

    @NotEmpty
    @Valid
    private List<Item> items;

    /** Optional promotion code to apply */
    private String promotionCode;

    /** Optional customer-visible note (e.g. "no onions") */
    private String customerNote;

    /**
     * The date/time for which this order is scheduled.
     * Must be in the future.
     */
    @NotNull(message = "scheduledAt is required for pre-orders")
    @Future(message = "scheduledAt must be a future date/time")
    private LocalDateTime scheduledAt;

    @Data
    public static class Item {
        @NotNull
        private Long itemId;

        @Min(1)
        private int quantity = 1;
    }
}
