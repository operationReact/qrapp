package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PhoneNumberRequest {
    @NotBlank
    private String phoneNumber;
    @jakarta.validation.constraints.Size(max = 128)
    private String googleLinkTicket;
}
