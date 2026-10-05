package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LocationAccessService {
    private final UserLocationAccessRepository accessRepository;
    private final LocationRepository locationRepository;

    public boolean canAccessLocation(User user, Long locationId) {
        if (user == null || locationId == null) return false;
        Location location = locationRepository.findById(locationId).orElse(null);
        if (location == null || !Boolean.TRUE.equals(location.getActive())) return false;
        // Only SUPER_ADMIN / SUPERUSER carries implicit access to every location.
        if (hasGlobalAccess(user)) return true;
        // ADMIN, MANAGER and KITCHEN_STAFF are all bound to their explicit,
        // active user_location_access assignments — a forged or unassigned
        // locationId therefore yields no matching grant and is rejected.
        if (usesLocationAssignments(user)) {
            return accessRepository.findByUserIdAndLocationId(user.getId(), locationId)
                    .filter(a -> Boolean.TRUE.equals(a.getActive())
                            && a.getLocation() != null
                            && Boolean.TRUE.equals(a.getLocation().getActive())
                            && locationId.equals(a.getLocation().getId()))
                    .isPresent();
        }
        // Remaining roles (e.g. CUSTOMER) are limited to their default location.
        return user.getDefaultLocation() != null
                && locationId.equals(user.getDefaultLocation().getId());
    }

    public void requireLocationAccess(User user, Long locationId) {
        if (!canAccessLocation(user, locationId)) {
            throw new AccessDeniedException("location_access_denied");
        }
    }

    public List<Location> getAccessibleLocations(User user) {
        if (user == null) return List.of();
        // Only SUPER_ADMIN / SUPERUSER sees every active location.
        if (hasGlobalAccess(user)) {
            return locationRepository.findByActiveTrueOrderByNameAsc();
        }
        // ADMIN, MANAGER and KITCHEN_STAFF are scoped to their active
        // user_location_access assignments (no implicit fallback).
        if (usesLocationAssignments(user)) {
            return accessRepository.findByUserIdAndActiveTrueAndLocationActiveTrueOrderByLocationNameAsc(user.getId())
                    .stream().map(UserLocationAccess::getLocation).toList();
        }
        // Remaining roles (e.g. CUSTOMER) use their default location for feed
        // access, falling back to the public PRAGATI_NAGAR location when unset.
        Location defaultLocation = user.getDefaultLocation();
        if (defaultLocation != null && Boolean.TRUE.equals(defaultLocation.getActive())) {
            return List.of(defaultLocation);
        }
        return locationRepository.findByCode("PRAGATI_NAGAR")
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .map(List::of)
                .orElse(List.of());
    }

    public List<Location> getPublicCustomerLocations() {
        return locationRepository.findByActiveTrueOrderByNameAsc();
    }

    public void requireSuperAdmin(User user) {
        if (user == null || !isSuperAdmin(user)) {
            throw new AccessDeniedException("super_admin_required");
        }
    }

    /**
     * Resolves the set of location IDs an admin-console user may see across the
     * order / dashboard / live-queue / pre-order surfaces.
     *
     * <p>Reuses the existing access primitives so behaviour stays consistent with
     * menu/combo/pricing authorization:
     * <ul>
     *   <li>SUPER_ADMIN: all locations. When {@code requestedLocationId} is null the
     *       result is {@link Optional#empty()} meaning "All Locations" (no filter);
     *       otherwise it is narrowed to the requested (active) location.</li>
     *   <li>ADMIN / MANAGER / KITCHEN_STAFF: bound to the locations they can access
     *       ({@link #getAccessibleLocations}). A requested location is validated with
     *       {@link #canAccessLocation}; with no explicit selection the scope is the
     *       user's full accessible set. ADMIN, MANAGER and KITCHEN_STAFF are all
     *       limited to their active {@code user_location_access} assignments — only
     *       SUPER_ADMIN retains global, cross-location access.</li>
     * </ul>
     *
     * @return {@link Optional#empty()} => no location filter (SUPER_ADMIN, all
     *         locations); a present list => restrict to exactly those IDs (possibly
     *         empty, meaning the user can see nothing).
     * @throws AccessDeniedException when a user requests a location they cannot
     *         access, or the requested location does not exist / is inactive.
     */
    public Optional<List<Long>> resolveDashboardLocationScope(User user, Long requestedLocationId) {
        if (user == null) {
            throw new AccessDeniedException("authentication_required");
        }
        if (isSuperAdmin(user)) {
            if (requestedLocationId == null) {
                return Optional.empty();
            }
            Location location = locationRepository.findById(requestedLocationId).orElse(null);
            if (location == null || !Boolean.TRUE.equals(location.getActive())) {
                throw new AccessDeniedException("location_not_found");
            }
            return Optional.of(List.of(requestedLocationId));
        }
        if (requestedLocationId != null) {
            if (!canAccessLocation(user, requestedLocationId)) {
                throw new AccessDeniedException("location_access_denied");
            }
            return Optional.of(List.of(requestedLocationId));
        }
        List<Long> ids = getAccessibleLocations(user).stream()
                .map(Location::getId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        return Optional.of(ids);
    }

    /** True when the user is limited to the Kitchen Queue only (KITCHEN_STAFF). */
    public boolean isKitchenStaffOnly(User user) {
        return user != null
                && !isSuperAdmin(user)
                && user.getRole() == UserRole.KITCHEN_STAFF;
    }

    /** Denies access to non-queue admin surfaces for KITCHEN_STAFF users. */
    public void requireNonKitchenAdmin(User user) {
        requireNonKitchenAdmin(user, null);
    }

    public void requireNonKitchenAdmin(User user, Long locationId) {
        if (user == null) {
            throw new AccessDeniedException("authentication_required");
        }
        if (locationId != null && usesLocationAssignments(user)) {
            UserRole role = accessRepository.findByUserIdAndLocationId(user.getId(), locationId)
                    .filter(a -> Boolean.TRUE.equals(a.getActive()))
                    .map(UserLocationAccess::getRole)
                    .orElse(UserRole.CUSTOMER);
            if (role != UserRole.ADMIN && role != UserRole.MANAGER) {
                throw new AccessDeniedException("kitchen_staff_queue_only");
            }
            return;
        }
        if (isKitchenStaffOnly(user)) {
            throw new AccessDeniedException("kitchen_staff_queue_only");
        }
    }

    public void requireNotSelf(User actor, User target) {
        if (actor != null && target != null && actor.getId() != null
                && actor.getId().equals(target.getId())) {
            throw new AccessDeniedException("self_access_management_denied");
        }
    }

    private boolean hasGlobalAccess(User user) {
        // Global, cross-location access is reserved for SUPER_ADMIN / SUPERUSER.
        // Regular ADMIN (and the legacy is_admin flag) no longer imply it — they
        // are governed by explicit user_location_access assignments instead.
        return isSuperAdmin(user);
    }

    /**
     * Roles whose location visibility is defined by their active
     * {@code user_location_access} assignments: ADMIN, MANAGER and KITCHEN_STAFF.
     */
    private boolean usesLocationAssignments(User user) {
        return user.getRole() == UserRole.ADMIN
                || user.getRole() == UserRole.MANAGER
                || user.getRole() == UserRole.KITCHEN_STAFF;
    }

    private boolean isSuperAdmin(User user) {
        return user.getRole() == UserRole.SUPER_ADMIN
                || Boolean.TRUE.equals(user.getIsSuperUser());
    }
}
