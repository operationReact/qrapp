package com.broandbro.qrapp.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String phone;
    private java.time.LocalDate dateOfBirth;
    private java.time.LocalDate specialDate;
    private String specialDayType;
    @jakarta.validation.constraints.Size(max = 120)
    private String specialDayCustomLabel;
    private boolean specialDateProvided;
    private boolean specialDayTypeProvided;
    private boolean specialDayCustomLabelProvided;
    private String currentPassword;
    private String newPassword;
    private Long defaultLocationId;
    private Long customerCompanyId;

    public void setSpecialDate(java.time.LocalDate specialDate) {
        this.specialDateProvided = true;
        this.specialDate = specialDate;
    }

    public void setSpecialDayType(String type) {
        this.specialDayTypeProvided = true;
        this.specialDayType = type;
    }

    public void setSpecialDayCustomLabel(String label) {
        this.specialDayCustomLabelProvided = true;
        this.specialDayCustomLabel = label;
    }

    public boolean hasSpecialDateChange() {
        return specialDateProvided || specialDayTypeProvided || specialDayCustomLabelProvided;
    }
}
