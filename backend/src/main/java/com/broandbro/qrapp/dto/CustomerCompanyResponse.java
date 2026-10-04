package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.CustomerCompany;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerCompanyResponse {
    private Long id;
    private String name;
    private Boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    private List<String> locationNames;
    private List<Long> locationIds;

    public static CustomerCompanyResponse from(CustomerCompany company) {
        return new CustomerCompanyResponse(company.getId(), company.getName(), company.getActive(),
                company.getCreatedAt(), company.getUpdatedAt(), List.of(), List.of());
    }

    public static CustomerCompanyResponse from(CustomerCompany company, List<String> locationNames) {
        return new CustomerCompanyResponse(company.getId(), company.getName(), company.getActive(),
                company.getCreatedAt(), company.getUpdatedAt(), locationNames, List.of());
    }

    public static CustomerCompanyResponse from(CustomerCompany company, List<String> locationNames, List<Long> locationIds) {
        return new CustomerCompanyResponse(company.getId(), company.getName(), company.getActive(),
                company.getCreatedAt(), company.getUpdatedAt(), locationNames, locationIds);
    }
}
