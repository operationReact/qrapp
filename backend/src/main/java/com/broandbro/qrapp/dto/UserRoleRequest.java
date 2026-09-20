package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserRoleRequest {
    @NotNull private UserRole role;
    private Long defaultLocationId;
}
