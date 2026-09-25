package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class CreateUserOptionsResponse {
    private List<LocationResponse> locations;
    private List<UserRole> roles;
}
