package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.VendorRequest;
import com.broandbro.qrapp.dto.VendorResponse;
import com.broandbro.qrapp.service.VendorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping({"/api/v1/vendors", "/api/v1/shops"})
@CrossOrigin(origins = "*")
public class VendorController {
    private final VendorService vendorService;
    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }
    @PostMapping
    public ResponseEntity<VendorResponse> createVendor(@RequestBody VendorRequest request) {
        try {
            VendorResponse response = vendorService.createVendor(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("already registered")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
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
}
