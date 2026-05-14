package com.broandbro.qrapp.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopResponse {
    private Long id;
    private String shopName;
    private String phoneNumber;
    private String alternatePhoneNumber;
    private String address;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
