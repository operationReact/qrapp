package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.VendorRequest;
import com.broandbro.qrapp.dto.VendorResponse;
import com.broandbro.qrapp.service.VendorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
@RestController
@RequestMapping({"/api/v1/vendors", "/api/v1/shops"})
public class VendorController {
    private final VendorService vendorService;
    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<VendorResponse> createVendor(@RequestBody VendorRequest request) {
        try {
            VendorResponse response = vendorService.createVendor(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("already registered")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<List<VendorResponse>> listVendors() {
        return ResponseEntity.ok(vendorService.listVendors());
    }

    @PutMapping("/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<VendorResponse> updateVendor(@PathVariable Long vendorId,
                                                       @RequestBody VendorRequest request) {
        try {
            return ResponseEntity.ok(vendorService.updateVendor(vendorId, request));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("already registered")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{vendorId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<VendorResponse> setActive(@PathVariable Long vendorId,
                                                    @RequestBody StatusRequest request) {
        try {
            return ResponseEntity.ok(vendorService.setActive(vendorId, request.active));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    @GetMapping("/{vendorId}")
    public ResponseEntity<VendorResponse> getVendor(@PathVariable Long vendorId) {
        try {
            VendorResponse response = vendorService.getVendor(vendorId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

    }
    public static class StatusRequest {
        public boolean active;

        public StatusRequest() {}

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }
    }
}
