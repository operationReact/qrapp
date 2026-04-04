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

    @Data
    public static class Item {
        @NotNull
        private Long itemId;

        @Min(1)
        private int quantity = 1;
    }
}