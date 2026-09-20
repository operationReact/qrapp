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
    void inactiveAndInvalidLocationsAreDeniedEvenForAdmin() {
        User user = User.builder().id(2L).role(UserRole.ADMIN).build();
        when(locations.findById(3L)).thenReturn(java.util.Optional.of(
                Location.builder().id(3L).active(false).build()));

        assertFalse(service.canAccessLocation(user, 3L));
        assertFalse(service.canAccessLocation(user, 404L));
    }
}
