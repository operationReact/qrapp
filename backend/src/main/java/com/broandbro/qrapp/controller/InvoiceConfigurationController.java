package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/invoice-configurations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class InvoiceConfigurationController {
    private final InvoiceConfigurationService service;

    @GetMapping
    public InvoiceConfiguration get() {
        return service.findGlobal();
    }

    @PutMapping
    public InvoiceConfiguration save(@RequestBody InvoiceConfiguration request,
                                     org.springframework.security.core.Authentication authentication) {
        request.setUpdatedBy(authentication == null ? null : authentication.getName());
        if (request.getCreatedBy() == null && authentication != null) request.setCreatedBy(authentication.getName());
        return service.save(request);
    }

    @PostMapping(value = "/assets/{assetType}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public InvoiceConfiguration upload(@PathVariable String assetType,
                                       @RequestPart("file") MultipartFile file) {
        return service.upload(assetType, file);
    }

    @GetMapping("/assets/{assetType}")
    public ResponseEntity<ByteArrayResource> asset(@PathVariable String assetType) {
        return service.readAsset(assetType)
                .map(content -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(content.contentType()))
                        .cacheControl(CacheControl.noCache())
                        .body(new ByteArrayResource(content.bytes())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
