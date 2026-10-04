package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserLocationAccessResponse {
    private LocationResponse location;
    private UserRole role;
}
