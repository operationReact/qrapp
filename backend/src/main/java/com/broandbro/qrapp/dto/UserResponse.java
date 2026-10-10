package com.broandbro.qrapp.dto;

import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String phone;
    private String name;
    private java.time.LocalDate dateOfBirth;
    private java.time.LocalDate specialDate;
    private String specialDayType;
    private String specialDayCustomLabel;
    private Boolean isAdmin;
    private Boolean isSuperUser;
    private Boolean mustChangePassword;
    private String role;
    private LocationResponse defaultLocation;
    private java.util.List<LocationResponse> locations;
    private java.util.List<UserLocationAccessResponse> locationAccess;
    private CustomerCompanyResponse customerCompany;
}
