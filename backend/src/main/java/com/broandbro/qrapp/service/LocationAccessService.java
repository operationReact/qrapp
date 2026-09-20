package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationAccessService {
    private final UserLocationAccessRepository accessRepository;
    private final LocationRepository locationRepository;

    public boolean canAccessLocation(User user, Long locationId) {
        if (user == null || locationId == null) return false;
        Location location = locationRepository.findById(locationId).orElse(null);
        if (location == null || !Boolean.TRUE.equals(location.getActive())) return false;
        if (hasGlobalAccess(user)) return true;
        if (user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.KITCHEN_STAFF) {
            return false;
        }
        return accessRepository.findByUserIdAndLocationId(user.getId(), locationId)
                .filter(a -> Boolean.TRUE.equals(a.getActive())
                        && a.getLocation() != null
                        && Boolean.TRUE.equals(a.getLocation().getActive())
                        && locationId.equals(a.getLocation().getId()))
                .isPresent();
    }

    public void requireLocationAccess(User user, Long locationId) {
        if (!canAccessLocation(user, locationId)) {
            throw new AccessDeniedException("location_access_denied");
        }
    }

    public List<Location> getAccessibleLocations(User user) {
        if (user == null) return List.of();
        if (hasGlobalAccess(user)) {
            return locationRepository.findByActiveTrueOrderByNameAsc();
        }
        if (user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.KITCHEN_STAFF) {
            return List.of();
        }
        return accessRepository.findByUserIdAndActiveTrueAndLocationActiveTrueOrderByLocationNameAsc(user.getId())
                .stream().map(UserLocationAccess::getLocation).toList();
    }

    public List<Location> getPublicCustomerLocations() {
        return locationRepository.findByActiveTrueOrderByNameAsc();
    }

    public void requireSuperAdmin(User user) {
        if (user == null || !isSuperAdmin(user)) {
            throw new AccessDeniedException("super_admin_required");
        }
    }

    public void requireNotSelf(User actor, User target) {
        if (actor != null && target != null && actor.getId() != null
                && actor.getId().equals(target.getId())) {
            throw new AccessDeniedException("self_access_management_denied");
        }
    }

    private boolean hasGlobalAccess(User user) {
        return isSuperAdmin(user) || user.getRole() == UserRole.ADMIN
                || Boolean.TRUE.equals(user.getIsAdmin());
    }

    private boolean isSuperAdmin(User user) {
        return user.getRole() == UserRole.SUPER_ADMIN
                || Boolean.TRUE.equals(user.getIsSuperUser());
    }
}
