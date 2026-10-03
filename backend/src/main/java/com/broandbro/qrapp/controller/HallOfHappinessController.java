package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.happiness.HallOfHappinessPhotoResponse;
import com.broandbro.qrapp.dto.happiness.HallOfHappinessPhotoUpdateRequest;
import com.broandbro.qrapp.dto.happiness.HallOfHappinessEligibilityResponse;
import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import com.broandbro.qrapp.service.HallOfHappinessService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.entity.User;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
public class HallOfHappinessController {

    private final HallOfHappinessService service;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    public HallOfHappinessController(HallOfHappinessService service,
                                     LocationAccessService locationAccessService,
                                     UserService userService) {
        this.service = service;
        this.locationAccessService = locationAccessService;
        this.userService = userService;
    }

    @GetMapping("/api/hall-of-happiness")
    public Page<HallOfHappinessPhotoResponse> feed(
            @RequestParam(required = false) Long locationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        return service.publishedFeed(locationId, page, size);
    }

    @GetMapping("/api/hall-of-happiness/my")
    public Page<HallOfHappinessPhotoResponse> myPhotos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal) {
        return service.customerPhotos(principal.getName(), page, size);
    }

    @GetMapping("/api/hall-of-happiness/my/orders/{orderId}/photos")
    public List<HallOfHappinessPhotoResponse> orderPhotos(
            @PathVariable Long orderId, Principal principal) {
        return service.customerOrderPhotos(orderId, principal.getName());
    }

    @GetMapping("/api/hall-of-happiness/my/orders/{orderId}/eligibility")
    public HallOfHappinessEligibilityResponse eligibility(
            @PathVariable Long orderId, Principal principal) {
        return service.eligibility(orderId, principal.getName());
    }

    @PostMapping("/api/hall-of-happiness/my/orders/{orderId}/invitation/{action}")
    public HallOfHappinessEligibilityResponse invitation(
            @PathVariable Long orderId, @PathVariable String action, Principal principal) {
        return service.markInvitation(orderId, principal.getName(), action);
    }

    @PostMapping(value = "/api/hall-of-happiness/my/orders/{orderId}/photos",
            consumes = "multipart/form-data")
    public ResponseEntity<List<HallOfHappinessPhotoResponse>> uploadCustomerPhotos(
            @PathVariable Long orderId,
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam(name = "captions", required = false) List<String> captions,
            @RequestParam boolean consent,
            @RequestParam(name = "termsVersion") String termsVersion,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.uploadCustomerPhotos(orderId, principal.getName(), files, captions, consent, termsVersion));
    }

    @DeleteMapping("/api/hall-of-happiness/my/{id}")
    public HallOfHappinessPhotoResponse withdrawCustomerPhoto(
            @PathVariable Long id, Principal principal) {
        return service.withdrawCustomerPhoto(id, principal.getName());
    }

    @PatchMapping("/api/hall-of-happiness/my/{id}/consent")
    public HallOfHappinessPhotoResponse updateConsent(
            @PathVariable Long id, @RequestParam boolean granted, Principal principal) {
        return service.setConsent(id, principal.getName(), granted);
    }

    @GetMapping("/api/admin/hall-of-happiness")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public Page<HallOfHappinessPhotoResponse> adminList(
            @RequestParam(required = false) HallOfHappinessPhotoStatus status,
            @RequestParam(required = false) HallOfHappinessConsentStatus consent,
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long locationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Principal principal) {
        User user = userService.findByPhone(principal.getName()).orElseThrow();
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        List<Long> locationIds = scope.orElse(List.of(-1L));
        return service.adminSearch(status, consent, orderId, customerId, fromDate, toDate,
                search, scope.isEmpty(), locationIds, page, size);
    }

    @PostMapping(value = "/api/admin/hall-of-happiness/curated", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ResponseEntity<HallOfHappinessPhotoResponse> createCurated(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String caption,
            @RequestParam(required = false) String eventLabel,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long locationId,
            @RequestParam(defaultValue = "false") boolean global,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.createCuratedPhoto(file, caption, eventLabel, description, locationId, global,
                        principal.getName()));
    }

    @PatchMapping("/api/admin/hall-of-happiness/photos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public HallOfHappinessPhotoResponse update(
            @PathVariable Long id,
            @Valid @RequestBody HallOfHappinessPhotoUpdateRequest request,
            Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        return service.updatePhoto(id, request, principal.getName());
    }

    @PostMapping("/api/admin/hall-of-happiness/photos/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public HallOfHappinessPhotoResponse approve(@PathVariable Long id, Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        return service.approve(id, principal.getName());
    }

    @PostMapping("/api/admin/hall-of-happiness/photos/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public HallOfHappinessPhotoResponse reject(@PathVariable Long id, Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        return service.reject(id, principal.getName());
    }

    @PostMapping("/api/admin/hall-of-happiness/photos/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public HallOfHappinessPhotoResponse publish(@PathVariable Long id, Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        return service.publish(id, principal.getName());
    }

    @PostMapping("/api/admin/hall-of-happiness/photos/{id}/unpublish")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public HallOfHappinessPhotoResponse unpublish(@PathVariable Long id, Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        return service.unpublish(id, principal.getName());
    }

    @DeleteMapping("/api/admin/hall-of-happiness/photos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ResponseEntity<Void> remove(@PathVariable Long id, Principal principal) {
        service.requireAdminPhotoAccess(id, adminUser(principal));
        service.remove(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    private User adminUser(Principal principal) {
        return userService.findByPhone(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("admin_not_found"));
    }
}
