package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateUserRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "(?i)(?:\\+91[\\s-]?)?[6-9]\\d{9}", message = "phone must be a valid Indian mobile number")
    private String phone;

    @NotBlank
    private String password;

    @NotNull
    private UserRole role;

    @NotNull
    private Long locationId;
}
