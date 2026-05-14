package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopOrderCreateRequest {
    private Long shopId;
    private List<ShopOrderItemRequest> items;
    private String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShopOrderItemRequest {
        private Long menuItemId;
        private Integer quantity;
    }
}
