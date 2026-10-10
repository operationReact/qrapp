package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.PartnerUserRepository;
import com.broandbro.qrapp.service.PartnerAccessService;
import com.broandbro.qrapp.service.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/partner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
@Transactional(readOnly = true)
public class PartnerPortalController {
    private final PartnerAccessService accessService;
    private final PartnerUserRepository partnerUserRepository;
    private final PartnerService partnerService;

    @GetMapping("/me")
    public PartnerPortalResponse me(org.springframework.security.core.Authentication authentication) {
        PartnerUser association = accessService.currentAssociation(authentication);
        Partner partner = association.getPartner();
        List<PartnerLocationResponse> locations = accessService.accessibleLocations(authentication)
                .stream().map(PartnerLocationResponse::from).toList();
        List<PartnerUserResponse> users = partnerUserRepository.findByPartnerIdOrderByUser_NameAsc(partner.getId())
                .stream().filter(link -> Boolean.TRUE.equals(link.getActive()))
                .map(PartnerUserResponse::from).toList();
        return new PartnerPortalResponse(
                PartnerSummaryResponse.from(partner, locations.size()),
                PortalUserResponse.from(association.getUser()), locations, users);
    }

    @GetMapping("/locations")
    public List<PartnerLocationResponse> locations(org.springframework.security.core.Authentication authentication) {
        return accessService.accessibleLocations(authentication).stream()
                .map(PartnerLocationResponse::from).toList();
    }

    @GetMapping("/dashboard")
    public PartnerDashboardResponse dashboard(org.springframework.security.core.Authentication authentication) {
        Partner partner = accessService.getCurrentPartner(authentication);
        long activeLocations = accessService.accessibleLocations(authentication).size();
        return new PartnerDashboardResponse(
                PartnerSummaryResponse.from(partner,
                        activeLocations),
                activeLocations,
                accessService.accessibleLocations(authentication).stream()
                        .filter(location -> "PRIMARY".equals(location.getRelationshipType().name())).count(),
                partnerUserRepository.countByPartnerIdAndActiveTrue(partner.getId()));
    }

    @GetMapping("/locations/{locationId}")
    public PartnerLocationResponse location(@PathVariable Long locationId,
                                            org.springframework.security.core.Authentication authentication) {
        return PartnerLocationResponse.from(accessService.accessibleLocation(locationId, authentication));
    }

    @GetMapping("/locations/{locationId}/users")
    public List<PartnerUserResponse> locationUsers(@PathVariable Long locationId,
                                                    org.springframework.security.core.Authentication authentication) {
        return accessService.activeUsersForLocation(locationId, authentication).stream()
                .map(user -> partnerUserRepository.findByPartnerIdAndUserId(
                                accessService.getCurrentPartner(authentication).getId(), user.getId())
                        .orElseThrow().getUser())
                .map(user -> new PartnerUserResponse(user.getId(), user.getId(), user.getName(), user.getPhone(),
                        true, user.getActive(), user.getCreatedAt()))
                .toList();
    }

    @GetMapping("/users")
    public List<PartnerUserResponse> users(org.springframework.security.core.Authentication authentication) {
        PartnerUser association = accessService.currentAssociation(authentication);
        return partnerUserRepository.findByPartnerIdOrderByUser_NameAsc(association.getPartner().getId())
                .stream().filter(link -> Boolean.TRUE.equals(link.getActive()))
                .map(PartnerUserResponse::from).toList();
    }

    @GetMapping("/profile")
    public PartnerSummaryResponse profile(org.springframework.security.core.Authentication authentication) {
        PartnerUser association = accessService.currentAssociation(authentication);
        return PartnerSummaryResponse.from(association.getPartner(),
                accessService.accessibleLocations(authentication).size());
    }

    @PatchMapping("/users/{userId}")
    @PreAuthorize("hasRole('PARTNER_ADMIN')")
    public PartnerUserResponse updateUser(@PathVariable Long userId,
                                          @RequestBody PartnerUserUpdateRequest request,
                                          org.springframework.security.core.Authentication authentication) {
        if (!accessService.canManageUsers(authentication)) {
            throw new org.springframework.security.access.AccessDeniedException("partner_admin_required");
        }
        PartnerUser association = accessService.currentAssociation(authentication);
        return partnerService.updateUser(association.getPartner().getId(), userId, request, authentication.getName());
    }
}
