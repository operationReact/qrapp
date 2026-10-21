package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateOrderRequest {
    @NotBlank
    private String phone;

    private PaymentMethod paymentMethod;

    @NotEmpty
    @Valid
    private List<Item> items;

    /** Optional promotion code to apply at order creation time */
    private String promotionCode;

    /**
     * Optional BYOC campaign ID — when present the server re-evaluates the cart
     * against this campaign and applies the unlocked tier discount.
     */
    private Long byocCampaignId;

    /**
     * Location ID where the order is being placed.
     * Frontend sends this to help with location validation and order routing.
     * Backend validates that user is authorized and all items belong to this location.
     */
    private Long locationId;

    @Data
    public static class Item {
        @NotNull
        private Long itemId;

        @Min(1)
        private int quantity = 1;

        /** Chosen add-on option ids (per unit). Validated and priced server-side. */
        private List<Long> optionIds = new java.util.ArrayList<>();
    }
}