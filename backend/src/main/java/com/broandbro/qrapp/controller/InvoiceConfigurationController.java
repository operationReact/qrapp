package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.repository.InvoiceConfigurationRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/invoice-configurations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class InvoiceConfigurationController {
    private final InvoiceConfigurationRepository repository;
    private final LocationRepository locationRepository;
    private final InvoiceConfigurationService service;

    @GetMapping("/{locationId}")
    public InvoiceConfiguration get(@PathVariable Long locationId) {
        requireLocation(locationId);
        return service.findForLocation(locationId);
    }

    @PutMapping("/{locationId}")
    public InvoiceConfiguration save(@PathVariable Long locationId,
                                     @RequestBody InvoiceConfiguration request,
                                     org.springframework.security.core.Authentication authentication) {
        requireLocation(locationId);
        request.setId(repository.findByLocationId(locationId).map(InvoiceConfiguration::getId).orElse(null));
        request.setLocationId(locationId);
        request.setUpdatedBy(authentication == null ? null : authentication.getName());
        if (request.getCreatedBy() == null && authentication != null) request.setCreatedBy(authentication.getName());
        return service.save(request);
    }

    @PostMapping(value = "/{locationId}/assets/{assetType}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public InvoiceConfiguration upload(@PathVariable Long locationId,
                                       @PathVariable String assetType,
                                       @RequestPart("file") MultipartFile file) {
        requireLocation(locationId);
        return service.upload(locationId, assetType, file);
    }

    private void requireLocation(Long locationId) {
        if (!locationRepository.existsById(locationId)) {
            throw new IllegalArgumentException("Location not found: " + locationId);
        }
    }
}
