package com.broandbro.qrapp.manualinvoice.controller;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.manualinvoice.dto.ManualInvoiceDtos.*;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import com.broandbro.qrapp.manualinvoice.exception.ManualInvoiceException;
import com.broandbro.qrapp.manualinvoice.service.ManualInvoicePdfService;
import com.broandbro.qrapp.manualinvoice.service.ManualInvoiceService;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin surface for the Manual Invoice Generation module. Access is restricted to
 * SUPER_ADMIN and ADMIN both at the URL layer ({@code /api/admin/**}) and here via
 * method security, giving defence in depth.
 */
@RestController
@RequestMapping("/api/admin/manual-invoices")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class ManualInvoiceController {
    private final ManualInvoiceService service;
    private final ManualInvoicePdfService pdfService;
    private final UserService userService;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(required = false) ManualInvoiceStatus status,
            @RequestParam(required = false) ManualInvoiceSourceType sourceType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<ManualInvoice> result = service.search(status, sourceType, from, to, search,
                PageRequest.of(Math.max(page, 0), safeSize));
        List<ManualInvoiceSummaryResponse> content = result.getContent().stream()
                .map(ManualInvoiceSummaryResponse::from).toList();
        return Map.of(
                "content", content,
                "page", result.getNumber(),
                "size", result.getSize(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages());
    }

    @GetMapping("/{id}")
    public ManualInvoiceResponse get(@PathVariable Long id) {
        return ManualInvoiceResponse.from(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ManualInvoiceResponse create(@Valid @RequestBody SaveManualInvoiceRequest request,
                                        Authentication authentication) {
        return ManualInvoiceResponse.from(service.createDraft(request, currentUser(authentication)));
    }

    @PutMapping("/{id}")
    public ManualInvoiceResponse update(@PathVariable Long id,
                                        @Valid @RequestBody SaveManualInvoiceRequest request,
                                        Authentication authentication) {
        return ManualInvoiceResponse.from(service.updateDraft(id, request, currentUser(authentication)));
    }

    @PostMapping("/{id}/finalize")
    public ManualInvoiceResponse finalizeInvoice(@PathVariable Long id, Authentication authentication) {
        return ManualInvoiceResponse.from(service.finalizeInvoice(id, currentUser(authentication)));
    }

    @PostMapping("/{id}/cancel")
    public ManualInvoiceResponse cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request,
                                        Authentication authentication) {
        return ManualInvoiceResponse.from(service.cancel(id, request.reason(), currentUser(authentication)));
    }

    @GetMapping("/{id}/audit")
    public List<AuditResponse> audit(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditResponse::from).toList();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<ByteArrayResource> pdf(@PathVariable Long id) {
        ManualInvoice invoice = service.get(id);
        byte[] bytes = pdfService.render(invoice);
        String name = invoice.getInvoiceNumber() == null
                ? "ManualInvoice-DRAFT-" + invoice.getId()
                : "ManualInvoice-" + invoice.getInvoiceNumber().replace('/', '-');
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name + ".pdf\"")
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null) {
            throw ManualInvoiceException.validation("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> ManualInvoiceException.validation("authentication_required"));
    }
}
