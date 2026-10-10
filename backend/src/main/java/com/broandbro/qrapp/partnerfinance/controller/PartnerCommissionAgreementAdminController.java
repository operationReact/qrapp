package com.broandbro.qrapp.partnerfinance.controller;

import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.*;
import com.broandbro.qrapp.partnerfinance.service.PartnerAgreementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Commission terms are platform-controlled: a partner must never be able to set its own commission, so
 * agreements live in the existing admin partner namespace (same roles as {@code PartnerController}).
 */
@RestController
@RequestMapping("/api/v1/partners/{partnerId}/commission-agreements")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERUSER')")
public class PartnerCommissionAgreementAdminController {
    private final PartnerAgreementService agreements;

    @GetMapping
    public List<AdminAgreementResponse> list(@PathVariable Long partnerId) {
        return agreements.listForAdmin(partnerId);
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AdminAgreementResponse> create(@PathVariable Long partnerId,
                                                         @Valid @RequestBody CreateAgreementRequest request,
                                                         Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agreements.create(partnerId, request, authentication));
    }

    @PostMapping("/{agreementId}/end")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public AdminAgreementResponse end(@PathVariable Long partnerId, @PathVariable Long agreementId,
                                      @Valid @RequestBody EndAgreementRequest request, Authentication authentication) {
        return agreements.end(partnerId, agreementId, request, authentication);
    }

    @PostMapping("/{agreementId}/void")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public AdminAgreementResponse voidAgreement(@PathVariable Long partnerId, @PathVariable Long agreementId,
                                                @Valid @RequestBody VoidAgreementRequest request,
                                                Authentication authentication) {
        return agreements.voidAgreement(partnerId, agreementId, request, authentication);
    }
}