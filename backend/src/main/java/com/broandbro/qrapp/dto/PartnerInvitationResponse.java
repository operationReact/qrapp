package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PartnerInvitationResponse {
    private String phone;
    private String temporaryPassword;
    private String message;
}
