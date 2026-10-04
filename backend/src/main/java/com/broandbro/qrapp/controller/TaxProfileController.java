package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.TaxProfile;
import com.broandbro.qrapp.repository.TaxProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/admin/tax-profiles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN')")
public class TaxProfileController {
    private final TaxProfileRepository repository;

    @GetMapping
    public List<TaxProfile> list() {
        return repository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaxProfile create(@Valid @RequestBody TaxProfileRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new IllegalArgumentException("Tax profile code already exists: " + request.code());
        }
        return repository.save(TaxProfile.builder()
                .code(request.code())
                .name(request.name())
                .taxType(request.taxType())
                .gstRate(request.gstRate())
                .cgstRate(request.cgstRate())
                .sgstRate(request.sgstRate())
                .igstRate(request.igstRate())
                .active(request.active())
                .effectiveFrom(request.effectiveFrom() == null ? LocalDate.now() : request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .itcEligible(request.itcEligible())
                .hsnSac(request.hsnSac())
                .build());
    }

    @PatchMapping("/{id}/active")
    public TaxProfile setActive(@PathVariable Long id, @RequestParam boolean active) {
        TaxProfile profile = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tax profile not found: " + id));
        profile.setActive(active);
        return repository.save(profile);
    }

    public record TaxProfileRequest(
            @NotBlank String code,
            @NotBlank String name,
            @NotNull com.broandbro.qrapp.enums.TaxType taxType,
            @NotNull BigDecimal gstRate,
            @NotNull BigDecimal cgstRate,
            @NotNull BigDecimal sgstRate,
            @NotNull BigDecimal igstRate,
            @NotNull Boolean active,
            LocalDate effectiveFrom,
            LocalDate effectiveTo,
            @NotNull Boolean itcEligible,
            String hsnSac
    ) {}
}
