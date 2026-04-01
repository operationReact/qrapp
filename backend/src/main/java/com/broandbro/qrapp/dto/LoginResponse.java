package com.broandbro.qrapp.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private UserResponse user;
}

