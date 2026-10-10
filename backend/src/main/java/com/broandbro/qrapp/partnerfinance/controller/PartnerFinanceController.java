package com.broandbro.qrapp.partnerfinance.controller;

import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.PartnerAgreementResponse;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.*;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.service.PartnerAgreementService;
import com.broandbro.qrapp.partnerfinance.service.PartnerSettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Partner-facing finance API. Reads are open to PARTNER_ADMIN and PARTNER_USER; every mutation is
 * PARTNER_ADMIN only (re-checked in the service). All data is scoped to the caller's own partner.
 */
@RestController
@RequestMapping("/api/v1/partner/finance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerFinanceController {
    private final PartnerSettlementService settlements;
    private final PartnerAgreementService agreements;

    @GetMapping("/agreements")
    public List<PartnerAgreementResponse> agreements(Authentication authentication) {
        return agreements.listForPartner(authentication);
    }

    @GetMapping("/agreements/current")
    public PartnerAgreementResponse currentAgreement(Authentication authentication) {
        return agreements.currentForPartner(authentication);
    }

    @GetMapping("/summary")
    public FinanceSummaryResponse summary(Authentication authentication) {
        return settlements.summary(authentication);
    }

    @GetMapping("/preview")
    public PreviewResponse preview(@RequestParam String period, Authentication authentication) {
        return settlements.preview(authentication, period);
    }

    @GetMapping("/settlements")
    public Page<SettlementResponse> list(@RequestParam(required = false) SettlementStatus status,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size,
                                         Authentication authentication) {
        return settlements.list(authentication, status, page, size);
    }

    @GetMapping("/settlements/{id}")
    public SettlementDetailResponse detail(@PathVariable Long id, Authentication authentication) {
        return settlements.detail(authentication, id);
    }

    @GetMapping("/settlements/{id}/line-items")
    public Page<LineItemResponse> lineItems(@PathVariable Long id,
                                            @RequestParam(required = false) Long locationId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size,
                                            Authentication authentication) {
        return settlements.lineItems(authentication, id, locationId, page, size);
    }

    @GetMapping("/settlements/{id}/audit")
    public List<AuditResponse> audit(@PathVariable Long id, Authentication authentication) {
        return settlements.auditTrail(authentication, id);
    }

    @GetMapping("/settlements/{id}/statement.pdf")
    public ResponseEntity<byte[]> statement(@PathVariable Long id, Authentication authentication) {
        PartnerSettlementService.StatementFile file = settlements.statement(authentication, id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(file.content());
    }

    @PostMapping("/settlements")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public ResponseEntity<SettlementDetailResponse> generate(@Valid @RequestBody GenerateSettlementRequest request,
                                                             Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(settlements.generate(authentication, request));
    }

    @PostMapping("/settlements/{id}/recalculate")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public SettlementDetailResponse recalculate(@PathVariable Long id, Authentication authentication) {
        return settlements.recalculate(authentication, id);
    }

    @PostMapping("/settlements/{id}/adjustments")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public ResponseEntity<SettlementDetailResponse> adjust(@PathVariable Long id,
                                                           @Valid @RequestBody AdjustmentRequest request,
                                                           Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(settlements.addAdjustment(authentication, id, request));
    }

    @PostMapping("/settlements/{id}/approve")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public SettlementDetailResponse approve(@PathVariable Long id, Authentication authentication) {
        return settlements.approve(authentication, id);
    }

    @PostMapping("/settlements/{id}/mark-paid")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public SettlementDetailResponse markPaid(@PathVariable Long id, @Valid @RequestBody MarkPaidRequest request,
                                             Authentication authentication) {
        return settlements.markPaid(authentication, id, request);
    }

    @PostMapping("/settlements/{id}/void")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public SettlementDetailResponse voidSettlement(@PathVariable Long id, @Valid @RequestBody ReasonRequest request,
                                                   Authentication authentication) {
        return settlements.voidSettlement(authentication, id, request);
    }
}