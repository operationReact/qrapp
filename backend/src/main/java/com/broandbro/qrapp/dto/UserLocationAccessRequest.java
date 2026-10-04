package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import com.broandbro.qrapp.entity.UserRole;

@Data
public class UserLocationAccessRequest {
    @NotNull private Boolean active = true;
    @NotNull private UserRole role = UserRole.CUSTOMER;
}
