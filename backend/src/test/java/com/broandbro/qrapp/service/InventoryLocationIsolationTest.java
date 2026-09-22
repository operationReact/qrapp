package com.broandbro.qrapp.service;

import com.broandbro.qrapp.controller.AdminInventoryController;
import com.broandbro.qrapp.dto.AdminInventoryUpdateRequest;
import com.broandbro.qrapp.dto.InventoryItemFilter;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.InventoryAuditRepository;
import com.broandbro.qrapp.repository.InventoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.impl.InventoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Verifies that the admin inventory surface honours the dashboard location scope:
 * SUPER_ADMIN ("All Locations") disables the filter, ADMIN/MANAGER are restricted
 * to their accessible location IDs, a user with no accessible location sees nothing,
 * and cross-location mutations are rejected.
 */
class InventoryLocationIsolationTest {

    private final Pageable pageable = PageRequest.of(0, 20);

    @Test
    void superAdminScopeDisablesLocationFilter() {
        InventoryRepository invRepo = mock(InventoryRepository.class);
        InventoryServiceImpl service = service(invRepo);
        when(invRepo.findLimitedItemsWithFilters(any(), any(), any(), anyBoolean(), anyBoolean(),
                anyBoolean(), anyList(), any(Pageable.class))).thenReturn(Page.empty());

        service.getInventoryItems(new InventoryItemFilter(), pageable, Optional.empty());

        ArgumentCaptor<Boolean> allLocations = ArgumentCaptor.forClass(Boolean.class);
        verify(invRepo).findLimitedItemsWithFilters(any(), any(), any(), anyBoolean(), anyBoolean(),
                allLocations.capture(), anyList(), any(Pageable.class));
        assertThat(allLocations.getValue()).isTrue();
    }

    @Test
    void restrictedScopeIsPassedThroughToQuery() {
        InventoryRepository invRepo = mock(InventoryRepository.class);
        InventoryServiceImpl service = service(invRepo);
        when(invRepo.findLimitedItemsWithFilters(any(), any(), any(), anyBoolean(), anyBoolean(),
                anyBoolean(), anyList(), any(Pageable.class))).thenReturn(Page.empty());

        service.getInventoryItems(new InventoryItemFilter(), pageable, Optional.of(List.of(5L)));

        ArgumentCaptor<Boolean> allLocations = ArgumentCaptor.forClass(Boolean.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> ids = ArgumentCaptor.forClass(List.class);
        verify(invRepo).findLimitedItemsWithFilters(any(), any(), any(), anyBoolean(), anyBoolean(),
                allLocations.capture(), ids.capture(), any(Pageable.class));
        assertThat(allLocations.getValue()).isFalse();
        assertThat(ids.getValue()).containsExactly(5L);
    }

    @Test
    void userWithNoAccessibleLocationSeesNothing() {
        InventoryRepository invRepo = mock(InventoryRepository.class);
        InventoryServiceImpl service = service(invRepo);

        Page<?> result = service.getInventoryItems(new InventoryItemFilter(), pageable, Optional.of(List.of()));

        assertThat(result.getContent()).isEmpty();
        verify(invRepo, never()).findLimitedItemsWithFilters(any(), any(), any(), anyBoolean(),
                anyBoolean(), anyBoolean(), anyList(), any(Pageable.class));
    }

    @Test
    void crossLocationUpdateIsRejected() {
        InventoryService inventoryService = mock(InventoryService.class);
        LocationAccessService locationAccess = mock(LocationAccessService.class);
        UserService userService = mock(UserService.class);
        AdminInventoryController controller =
                new AdminInventoryController(inventoryService, locationAccess, userService);

        User user = User.builder().build();
        when(userService.findByPhone("admin")).thenReturn(Optional.of(user));
        when(inventoryService.getMenuItemLocationId(20L)).thenReturn(2L);
        doThrow(new AccessDeniedException("location_access_denied"))
                .when(locationAccess).requireLocationAccess(user, 2L);

        assertThatThrownBy(() -> controller.updateItem(20L, new AdminInventoryUpdateRequest(), auth("admin")))
                .isInstanceOf(AccessDeniedException.class);
        verify(inventoryService, never()).updateItem(anyLong(), any(), anyString());
    }

    private static InventoryServiceImpl service(InventoryRepository invRepo) {
        return new InventoryServiceImpl(invRepo, mock(InventoryAuditRepository.class), mock(MenuRepository.class));
    }

    private static Authentication auth(String name) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(name);
        return authentication;
    }
}
