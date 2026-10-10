package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.partnerreports.PartnerReportDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Partner-scoped reports. The partner is taken from the authenticated user; {@code locationId} must be one of
 * that partner's active locations. Dates may be given as from/to (or startDate/endDate) or via a named period.
 */
@RestController
@RequestMapping("/api/v1/partner/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerReportController {
    private final PartnerReportService service;

    @GetMapping
    public ReportCatalog catalog(Authentication authentication) {
        return service.catalog(authentication);
    }

    @GetMapping("/{type}/summary")
    public ReportSummary summary(@PathVariable String type,
                                 @RequestParam(required = false) Long locationId,
                                 @RequestParam(required = false) String period,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                 Authentication authentication) {
        return service.summary(authentication, type, locationId, period,
                from != null ? from : startDate, to != null ? to : endDate);
    }

    @GetMapping("/{type}/export.csv")
    public ResponseEntity<byte[]> csv(@PathVariable String type,
                                      @RequestParam(required = false) Long locationId,
                                      @RequestParam(required = false) String period,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                      Authentication authentication) {
        return file(service.csv(authentication, type, locationId, period,
                from != null ? from : startDate, to != null ? to : endDate));
    }

    @GetMapping("/executive.pdf")
    public ResponseEntity<byte[]> executive(@RequestParam(required = false) Long locationId,
                                            @RequestParam(required = false) String period,
                                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                            Authentication authentication) {
        return file(service.executivePdf(authentication, locationId, period,
                from != null ? from : startDate, to != null ? to : endDate));
    }

    private ResponseEntity<byte[]> file(ReportFile file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.content());
    }
}