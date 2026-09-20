package com.broandbro.qrapp.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorOrderCreateRequest {
    @JsonAlias("shopId")
    private Long vendorId;
    private List<VendorOrderItemRequest> items;
    private String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorOrderItemRequest {
        private Long menuItemId;
        private Integer quantity;
    }
}
