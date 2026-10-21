package com.broandbro.qrapp.addon.controller;

import com.broandbro.qrapp.addon.dto.AddonDtos.*;
import com.broandbro.qrapp.addon.service.AddonService;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Admin API for add-on option groups.
 *
 * <pre>
 * GET    /api/admin/addon-groups?locationId=          – list groups with options
 * POST   /api/admin/addon-groups?locationId=          – create group (with options)
 * PUT    /api/admin/addon-groups/{id}?locationId=     – update group (replaces options if sent)
 * DELETE /api/admin/addon-groups/{id}?locationId=     – delete group
 * POST   /api/admin/addon-groups/menu-items/{itemId}?locationId=          – attach group to item
 * DELETE /api/admin/addon-groups/menu-items/{itemId}/{groupId}?locationId= – detach group from item
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/addon-groups")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN')")
public class AddonAdminController {

    private final AddonService addonService;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<GroupResponse>> list(@RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(addonService.listGroups(locationId));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody GroupRequest req,
                                    @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(addonService.createGroup(locationId, req));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody GroupRequest req,
                                    @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        try {
            return ResponseEntity.ok(addonService.updateGroup(locationId, id, req));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        try {
            addonService.deleteGroup(locationId, id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/menu-items/{itemId}")
    public ResponseEntity<List<Long>> attachedGroups(@PathVariable Long itemId,
                                                     @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(addonService.listAttachedGroupIds(locationId, itemId));
    }

    @PostMapping("/menu-items/{itemId}")
    public ResponseEntity<?> attach(@PathVariable Long itemId, @Valid @RequestBody AttachRequest req,
                                    @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        try {
            addonService.attachGroup(locationId, itemId, req);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            return badRequest(e);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/menu-items/{itemId}/{groupId}")
    public ResponseEntity<Void> detach(@PathVariable Long itemId, @PathVariable Long groupId,
                                       @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        try {
            addonService.detachGroup(locationId, itemId, groupId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(RuntimeException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    private void requireLocation(Long locationId, Authentication auth) {
        if (locationId == null || auth == null) {
            throw new AccessDeniedException("location_access_denied");
        }
        User user = userService.findByPhone(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("location_access_denied"));
        locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new AccessDeniedException("location_not_found_or_inactive"));
        locationAccessService.requireLocationAccess(user, locationId);
    }
}
