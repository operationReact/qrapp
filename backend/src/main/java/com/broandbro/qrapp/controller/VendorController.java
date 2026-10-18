package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.VendorLookupResponse;
import com.broandbro.qrapp.dto.VendorRequest;
import com.broandbro.qrapp.dto.VendorResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.VendorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping({"/api/v1/vendors", "/api/v1/shops"})
public class VendorController {

    private final VendorService vendorService;
    private final UserService userService;
    private final LocationAccessService locationAccessService;

    public VendorController(VendorService vendorService, UserService userService, LocationAccessService locationAccessService) {
        this.vendorService = vendorService;
        this.userService = userService;
        this.locationAccessService = locationAccessService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<Object> createVendor(@RequestParam Long locationId,
                                               @RequestBody VendorRequest request,
                                               Authentication authentication) {
        requireAccess(locationId, authentication);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(vendorService.createVendor(request, locationId));
        } catch (IllegalStateException e) {
            return error(HttpStatus.CONFLICT, e.getMessage());
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (NoSuchElementException e) {
            return error(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<Object> lookup(@RequestParam Long locationId,
                                         @RequestParam String phone,
                                         Authentication authentication) {
        requireAccess(locationId, authentication);
        try {
            VendorLookupResponse response = vendorService.lookup(phone, locationId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<List<VendorResponse>> listVendors(@RequestParam Long locationId, Authentication authentication) {
        requireAccess(locationId, authentication);
        return ResponseEntity.ok(vendorService.listVendors(locationId));
    }

    @PutMapping("/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<Object> updateVendor(@PathVariable Long vendorId,
                                               @RequestParam Long locationId,
                                               @RequestBody VendorRequest request,
                                               Authentication authentication) {
        requireAccess(locationId, authentication);
        try {
            return ResponseEntity.ok(vendorService.updateVendor(vendorId, request, locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("already registered")) {
                return error(HttpStatus.CONFLICT, "phone_taken");
            }
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{vendorId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<VendorResponse> setActive(@PathVariable Long vendorId,
                                                    @RequestParam Long locationId,
                                                    @RequestBody StatusRequest request,
                                                    Authentication authentication) {
        requireAccess(locationId, authentication);
        try {
            return ResponseEntity.ok(vendorService.setActive(vendorId, request.active, locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPERUSER')")
    public ResponseEntity<VendorResponse> getVendor(@PathVariable Long vendorId,
                                                    @RequestParam Long locationId,
                                                    Authentication authentication) {
        requireAccess(locationId, authentication);
        try {
            return ResponseEntity.ok(vendorService.getVendor(vendorId, locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    private ResponseEntity<Object> error(HttpStatus status, String code) {
        return ResponseEntity.status(status).body(Map.of("error", code == null ? "vendor_error" : code));
    }

    private void requireAccess(Long locationId, Authentication authentication) {
        User user = userService.findByPhone(authentication.getName()).orElseThrow();
        locationAccessService.requireLocationAccess(user, locationId);
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
