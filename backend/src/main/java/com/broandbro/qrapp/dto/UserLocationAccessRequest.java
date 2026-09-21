package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserLocationAccessRequest {
    @NotNull private Boolean active = true;
}
