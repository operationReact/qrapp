package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LocationAccessServiceTest {
    private final UserLocationAccessRepository accesses = mock(UserLocationAccessRepository.class);
    private final LocationRepository locations = mock(LocationRepository.class);
    private final LocationAccessService service = new LocationAccessService(accesses, locations);

    @Test
    void assignedActiveUserCanAccessActiveLocation() {
        User user = User.builder().id(7L).role(UserRole.MANAGER).build();
        Location location = Location.builder().id(3L).active(true).build();
        UserLocationAccess access = UserLocationAccess.builder().user(user).location(location).active(true).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(location));
        when(accesses.findByUserIdAndLocationId(7L, 3L)).thenReturn(java.util.Optional.of(access));

        assertTrue(service.canAccessLocation(user, 3L));
    }

    @Test
    void inactiveAssignmentIsDenied() {
        User user = User.builder().id(7L).role(UserRole.MANAGER).build();
        Location location = Location.builder().id(3L).active(true).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(location));
        when(accesses.findByUserIdAndLocationId(7L, 3L))
                .thenReturn(java.util.Optional.of(UserLocationAccess.builder().user(user).location(location).active(false).build()));

        assertFalse(service.canAccessLocation(user, 3L));
        assertThrows(AccessDeniedException.class, () -> service.requireLocationAccess(user, 3L));
    }

    @Test
    void superAdminCanAccessAllActiveLocations() {
        User user = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        Location location = Location.builder().id(3L).active(true).build();
        when(locations.findById(999L)).thenReturn(java.util.Optional.of(location));
        when(locations.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(location));

        assertTrue(service.canAccessLocation(user, 999L));
        assertEquals(List.of(location), service.getAccessibleLocations(user));
        verifyNoInteractions(accesses);
    }

    @Test
    void adminHasGlobalAccessToActiveLocation() {
        User user = User.builder().id(2L).role(UserRole.ADMIN).build();
        Location location = Location.builder().id(3L).active(true).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(location));

        assertTrue(service.canAccessLocation(user, 3L));
        verifyNoInteractions(accesses);
    }

    @Test
    void kitchenStaffNeedsAnActiveAssignment() {
        User user = User.builder().id(7L).role(UserRole.KITCHEN_STAFF).build();
        Location location = Location.builder().id(3L).active(true).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(location));
        when(accesses.findByUserIdAndLocationId(7L, 3L)).thenReturn(java.util.Optional.empty());

        assertFalse(service.canAccessLocation(user, 3L));
    }

    @Test
    void customerUsesDefaultLocationForFeedAccess() {
        Location location = Location.builder().id(6L).active(true).code("PRAGATI_NAGAR").build();
        User user = User.builder().id(8L).role(UserRole.CUSTOMER).defaultLocation(location).build();
        when(locations.findById(6L)).thenReturn(java.util.Optional.of(location));

        assertTrue(service.canAccessLocation(user, 6L));
        assertEquals(List.of(location), service.getAccessibleLocations(user));
    }

    @Test
    void inactiveAndInvalidLocationsAreDeniedEvenForAdmin() {
        User user = User.builder().id(2L).role(UserRole.ADMIN).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(
                Location.builder().id(3L).active(false).build()));

        assertFalse(service.canAccessLocation(user, 3L));
        assertFalse(service.canAccessLocation(user, 404L));
    }

    // ── Dashboard location scope resolution ───────────────────────────────────

    @Test
    void superAdminGetsAllLocationsWhenNoLocationRequested() {
        User user = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();

        java.util.Optional<List<Long>> scope = service.resolveDashboardLocationScope(user, null);

        assertTrue(scope.isEmpty(), "empty Optional means All Locations (no filter)");
        verifyNoInteractions(accesses);
    }

    @Test
    void superAdminNarrowsToRequestedActiveLocation() {
        User user = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        when(locations.findById(5L)).thenReturn(java.util.Optional.of(
                Location.builder().id(5L).active(true).build()));

        java.util.Optional<List<Long>> scope = service.resolveDashboardLocationScope(user, 5L);

        assertEquals(List.of(5L), scope.orElseThrow());
    }

    @Test
    void superAdminRejectsInactiveRequestedLocation() {
        User user = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        when(locations.findById(5L)).thenReturn(java.util.Optional.of(
                Location.builder().id(5L).active(false).build()));

        assertThrows(AccessDeniedException.class, () -> service.resolveDashboardLocationScope(user, 5L));
    }

    @Test
    void adminIsScopedToAccessibleLocationsWhenNoneRequested() {
        Location loc = Location.builder().id(3L).active(true).build();
        User user = User.builder().id(2L).role(UserRole.ADMIN).build();
        when(locations.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(loc));

        java.util.Optional<List<Long>> scope = service.resolveDashboardLocationScope(user, null);

        assertEquals(List.of(3L), scope.orElseThrow());
    }

    @Test
    void adminMayViewAnyActiveLocationWhenRequested() {
        User user = User.builder().id(2L).role(UserRole.ADMIN).build();
        when(locations.findById(8L)).thenReturn(java.util.Optional.of(
                Location.builder().id(8L).active(true).build()));

        java.util.Optional<List<Long>> scope = service.resolveDashboardLocationScope(user, 8L);

        assertEquals(List.of(8L), scope.orElseThrow());
    }

    @Test
    void managerIsScopedToActiveAssignments() {
        Location a = Location.builder().id(10L).active(true).build();
        Location b = Location.builder().id(11L).active(true).build();
        User user = User.builder().id(7L).role(UserRole.MANAGER).build();
        when(accesses.findByUserIdAndActiveTrueAndLocationActiveTrueOrderByLocationNameAsc(7L))
                .thenReturn(List.of(
                        UserLocationAccess.builder().user(user).location(a).active(true).build(),
                        UserLocationAccess.builder().user(user).location(b).active(true).build()));

        java.util.Optional<List<Long>> scope = service.resolveDashboardLocationScope(user, null);

        assertEquals(List.of(10L, 11L), scope.orElseThrow());
    }

    @Test
    void managerRejectsUnassignedLocation() {
        User user = User.builder().id(7L).role(UserRole.MANAGER).build();
        when(locations.findById(999L)).thenReturn(java.util.Optional.of(
                Location.builder().id(999L).active(true).build()));
        when(accesses.findByUserIdAndLocationId(7L, 999L)).thenReturn(java.util.Optional.empty());

        assertThrows(AccessDeniedException.class, () -> service.resolveDashboardLocationScope(user, 999L));
    }

    @Test
    void kitchenStaffIsRestrictedToQueueOnly() {
        User kitchen = User.builder().id(9L).role(UserRole.KITCHEN_STAFF).build();
        User admin = User.builder().id(2L).role(UserRole.ADMIN).build();
        User superAdmin = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();

        assertTrue(service.isKitchenStaffOnly(kitchen));
        assertFalse(service.isKitchenStaffOnly(admin));
        assertFalse(service.isKitchenStaffOnly(superAdmin));

        assertThrows(AccessDeniedException.class, () -> service.requireNonKitchenAdmin(kitchen));
        assertDoesNotThrow(() -> service.requireNonKitchenAdmin(admin));
    }
}
