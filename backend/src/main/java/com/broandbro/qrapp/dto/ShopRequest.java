package com.broandbro.qrapp.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopRequest {
    private String shopName;
    private String phoneNumber;
    private String alternatePhoneNumber;
    private String address;
}
