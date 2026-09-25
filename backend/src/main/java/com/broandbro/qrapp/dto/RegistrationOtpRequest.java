package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.Data;

@Data
public class RegistrationOtpRequest {
    @NotBlank
    private String phoneNumber;
    @NotBlank
    private String password;
    private String name;
    @PastOrPresent
    private java.time.LocalDate dateOfBirth;
    private java.time.LocalDate specialDate;
    private String specialDayType;
    @jakarta.validation.constraints.Size(max = 120)
    private String specialDayCustomLabel;
    private Long defaultLocationId;
    @NotNull
    private Long customerCompanyId;
    @NotNull
    private Boolean termsAccepted;
}
