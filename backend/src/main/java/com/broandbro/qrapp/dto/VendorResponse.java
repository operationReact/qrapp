package com.broandbro.qrapp.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorResponse {
    private Long id;
    private String vendorName;
    private String phoneNumber;
    private String alternatePhoneNumber;
    private String address;
    private Long locationId;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
