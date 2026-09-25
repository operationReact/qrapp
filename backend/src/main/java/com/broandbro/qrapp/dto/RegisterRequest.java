package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String phone;
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
    private Long customerCompanyId;
    private Boolean termsAccepted;
}
