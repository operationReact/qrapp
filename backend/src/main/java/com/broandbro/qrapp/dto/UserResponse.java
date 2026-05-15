package com.broandbro.qrapp.dto;

import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String phone;
    private String name;
    private Boolean isAdmin;
    private Boolean isSuperUser;
}
