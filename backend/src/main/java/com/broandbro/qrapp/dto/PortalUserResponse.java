package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PortalUserResponse {
    private Long id;
    private String name;
    private String phone;
    private String role;

    public static PortalUserResponse from(User user) {
        return new PortalUserResponse(user.getId(), user.getName(), user.getPhone(),
                user.getRole() == null ? null : user.getRole().name());
    }
}
