package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;

public class SendOtpRequest {
    @NotBlank
    private String mobileNumber;

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
}
