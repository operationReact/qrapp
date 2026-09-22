package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.CustomerCompany;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerCompanyResponse {
    private Long id;
    private String name;
    private Boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    public static CustomerCompanyResponse from(CustomerCompany company) {
        return new CustomerCompanyResponse(company.getId(), company.getName(), company.getActive(),
                company.getCreatedAt(), company.getUpdatedAt());
    }
}
