package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Partner;
import lombok.*;

import java.time.Instant;

@Data
public class PartnerResponse {
    private Long id;
    private String partnerCode;
    private String legalName;
    private String displayName;
    private String status;
    private String primaryContactName;
    private String primaryContactEmail;
    private String primaryContactPhone;
    private String alternateContactPhone;
    private String businessType;
    private String registeredAddress;
    private String city;
    private String state;
    private String pincode;
    private String country;
    private Boolean gstRegistered;
    private String gstin;
    private String pan;
    private String tan;
    private String fssai;
    private String otherRegistrationDetails;
    private String accountHolderName;
    private String bankName;
    private String maskedAccountNumber;
    private String ifsc;
    private String upiId;
    private String logoUrl;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;

    public static PartnerResponse from(Partner p) {
        PartnerResponse r = new PartnerResponse();
        r.id = p.getId(); r.partnerCode = p.getPartnerCode(); r.legalName = p.getLegalName();
        r.displayName = p.getDisplayName(); r.status = p.getStatus().name();
        r.primaryContactName = p.getPrimaryContactName(); r.primaryContactEmail = p.getPrimaryContactEmail();
        r.primaryContactPhone = p.getPrimaryContactPhone(); r.alternateContactPhone = p.getAlternateContactPhone();
        r.businessType = p.getBusinessType(); r.registeredAddress = p.getRegisteredAddress(); r.city = p.getCity();
        r.state = p.getState(); r.pincode = p.getPincode(); r.country = p.getCountry();
        r.gstRegistered = p.getGstRegistered(); r.gstin = p.getGstin(); r.pan = p.getPan(); r.tan = p.getTan();
        r.fssai = p.getFssai(); r.otherRegistrationDetails = p.getOtherRegistrationDetails();
        r.accountHolderName = p.getAccountHolderName(); r.bankName = p.getBankName();
        r.maskedAccountNumber = mask(p.getAccountNumber()); r.ifsc = p.getIfsc(); r.upiId = p.getUpiId();
        r.logoUrl = p.getLogoUrl(); r.createdAt = p.getCreatedAt(); r.updatedAt = p.getUpdatedAt();
        r.createdBy = p.getCreatedBy(); r.updatedBy = p.getUpdatedBy();
        return r;
    }

    private static String mask(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return null;
        String value = accountNumber.trim();
        return "****" + value.substring(Math.max(0, value.length() - 4));
    }
}
