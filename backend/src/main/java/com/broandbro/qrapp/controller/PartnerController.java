package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.PartnerStatus;
import com.broandbro.qrapp.service.PartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERUSER')")
public class PartnerController {
    private final PartnerService partnerService;

    @GetMapping
    public List<PartnerSummaryResponse> list() { return partnerService.list(); }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody CreatePartnerRequest request,
                                    org.springframework.security.core.Authentication authentication) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(partnerService.create(request, actor(authentication)));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("partner_code_taken");
        }
    }

    @GetMapping("/{id}")
    public PartnerResponse get(@PathVariable Long id) { return partnerService.get(id); }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpdatePartnerRequest request,
                                    org.springframework.security.core.Authentication authentication) {
        try {
            return ResponseEntity.ok(partnerService.update(id, request, actor(authentication)));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("partner_code_taken");
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PartnerResponse status(@PathVariable Long id, @RequestBody StatusRequest request,
                                  org.springframework.security.core.Authentication authentication) {
        return partnerService.setStatus(id, request.status, actor(authentication));
    }

    @GetMapping("/{id}/locations")
    public List<PartnerLocationResponse> locations(@PathVariable Long id) { return partnerService.locations(id); }

    @PostMapping("/{id}/locations")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PartnerLocationResponse> assign(@PathVariable Long id,
                                                          @Valid @RequestBody PartnerLocationRequest request,
                                                          org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(partnerService.assignLocation(id, request, actor(authentication)));
    }

    @DeleteMapping("/{id}/locations/{assignmentId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id, @PathVariable Long assignmentId,
                       org.springframework.security.core.Authentication authentication) {
        partnerService.removeLocation(id, assignmentId, actor(authentication));
    }

    @PatchMapping("/{id}/locations/{assignmentId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PartnerLocationResponse updateLocation(@PathVariable Long id, @PathVariable Long assignmentId,
                                                   @Valid @RequestBody PartnerLocationUpdateRequest request,
                                                   org.springframework.security.core.Authentication authentication) {
        return partnerService.updateLocation(id, assignmentId, request, actor(authentication));
    }

    @GetMapping("/{id}/users")
    public List<PartnerUserResponse> users(@PathVariable Long id) { return partnerService.users(id); }

    @PostMapping("/{id}/users")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PartnerUserResponse> addUser(@PathVariable Long id,
                                                       @Valid @RequestBody PartnerUserRequest request,
                                                       org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(partnerService.addUser(id, request, actor(authentication)));
    }

    @PostMapping("/{id}/users/create")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PartnerInvitationResponse> createUser(@PathVariable Long id,
                                                                  @Valid @RequestBody CreatePartnerUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partnerService.createUser(id, request));
    }

    @DeleteMapping("/{id}/users/{userId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeUser(@PathVariable Long id, @PathVariable Long userId,
                           org.springframework.security.core.Authentication authentication) {
        partnerService.removeUser(id, userId, actor(authentication));
    }

    @PostMapping("/{id}/users/{userId}/invite")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PartnerInvitationResponse> inviteUser(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(partnerService.inviteUser(id, userId));
    }

    @PatchMapping("/{id}/users/{userId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PartnerUserResponse updateUser(@PathVariable Long id, @PathVariable Long userId,
                                          @Valid @RequestBody PartnerUserUpdateRequest request,
                                          org.springframework.security.core.Authentication authentication) {
        return partnerService.updateUser(id, userId, request, actor(authentication));
    }

    private static String actor(org.springframework.security.core.Authentication authentication) {
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<String> notFound(EntityNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(exception.getMessage());
    }

    @ExceptionHandler(PartnerService.ConflictException.class)
    ResponseEntity<String> conflict(PartnerService.ConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(exception.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<String> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }

    public static class StatusRequest {
        public PartnerStatus status;
        public boolean isActive() { return status == PartnerStatus.ACTIVE; }
    }
}
