package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Validated
public class CustomerCompanyController {
    private final CustomerCompanyService companyService;
    private final UserService userService;
    private final LocationAccessService locationAccessService;

    @GetMapping("/api/locations/{locationId}/customer-companies")
    public List<CustomerCompanyResponse> publicCompanies(@PathVariable Long locationId) {
        return companyService.listActiveForLocation(locationId).stream()
                .map(CustomerCompanyResponse::from).toList();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/admin/customer-companies")
    public List<CustomerCompanyResponse> companies(Authentication authentication) {
        authorize(authentication);
        return companyService.listAll().stream().map(CustomerCompanyResponse::from).toList();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/api/admin/customer-companies")
    public ResponseEntity<CustomerCompanyResponse> create(@Valid @RequestBody CustomerCompanyRequest request,
                                                           Authentication authentication) {
        authorize(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomerCompanyResponse.from(companyService.create(request)));
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/api/admin/customer-companies/{id}")
    public CustomerCompanyResponse update(@PathVariable Long id,
                                          @Valid @RequestBody CustomerCompanyRequest request,
                                          Authentication authentication) {
        authorize(authentication);
        return CustomerCompanyResponse.from(companyService.update(id, request));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/admin/locations/{locationId}/customer-companies")
    public List<CustomerCompanyResponse> locationCompanies(@PathVariable Long locationId,
                                                            Authentication authentication) {
        authorize(authentication);
        return companyService.listForLocation(locationId).stream().map(CustomerCompanyResponse::from).toList();
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/api/admin/locations/{locationId}/customer-companies/{companyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assign(@PathVariable Long locationId, @PathVariable Long companyId,
                       Authentication authentication) {
        authorize(authentication);
        companyService.assign(locationId, companyId);
    }

    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/api/admin/locations/{locationId}/customer-companies/{companyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long locationId, @PathVariable Long companyId,
                       Authentication authentication) {
        authorize(authentication);
        companyService.remove(locationId, companyId);
    }

    private User authorize(Authentication authentication) {
        User actor = authentication == null ? null : userService.findByPhone(authentication.getName()).orElse(null);
        locationAccessService.requireSuperAdmin(actor);
        return actor;
    }
}
