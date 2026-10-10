package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreatePartnerRequest {
    @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Za-z0-9_-]+")
    private String partnerCode;
    @NotBlank @Size(max = 200)
    private String legalName;
    @NotBlank @Size(max = 200)
    private String displayName;
    @NotBlank @Size(max = 160)
    private String primaryContactName;
    @NotBlank @Email @Size(max = 254)
    private String primaryContactEmail;
    @NotBlank @Pattern(regexp = "\\+?[0-9 ()-]{10,20}")
    private String primaryContactPhone;
    @Pattern(regexp = "^$|\\+?[0-9 ()-]{10,20}")
    private String alternateContactPhone;
    private String businessType;
    private String registeredAddress;
    private String city;
    private String state;
    @Pattern(regexp = "^$|\\d{6}")
    private String pincode;
    private String country = "India";
    private Boolean gstRegistered = false;
    @Pattern(regexp = "^$|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]")
    private String gstin;
    @Pattern(regexp = "^$|[A-Z]{5}[0-9]{4}[A-Z]")
    private String pan;
    private String tan;
    private String fssai;
    private String otherRegistrationDetails;
    private String accountHolderName;
    private String bankName;
    private String accountNumber;
    @Pattern(regexp = "^$|[A-Z]{4}0[A-Z0-9]{6}")
    private String ifsc;
    private String upiId;
    private String logoUrl;
}
