package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.ComboResponse;
import com.broandbro.qrapp.combo.service.ComboService;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ComboAdminControllerIsolationTest {

    @Test
    void comboGetRejectsCrossLocationTarget() {
        ComboService combos = mock(ComboService.class);
        when(combos.getComboById(50L, 2L))
                .thenThrow(new RuntimeException("combo not found"));
        ComboAdminController controller = controller(combos);

        assertThatThrownBy(() -> controller.getCombo(50L, 2L, authentication()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("combo not found");
        verify(combos).getComboById(50L, 2L);
    }

    @Test
    void comboListPassesAuthorizedLocationToService() {
        ComboService combos = mock(ComboService.class);
        ComboAdminController controller = controller(combos);

        controller.listCombos(null, null, null, null, null, null,
                2L, authentication(), org.springframework.data.domain.PageRequest.of(0, 20));

        verify(combos).listCombos(null, null, null, null, null, null,
                org.springframework.data.domain.PageRequest.of(0, 20), 2L);
    }

    @Test
    void analyticsSummaryResolvesScopeAndDelegates() {
        ComboService combos = mock(ComboService.class);
        LocationRepository locations = mock(LocationRepository.class);
        UserService users = mock(UserService.class);
        var resolver = mock(com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver.class);
        var scope = com.broandbro.qrapp.analytics.support.AnalyticsLocationScope
                .from(Optional.of(java.util.List.of(2L)));
        when(resolver.resolve(any(), eq(2L))).thenReturn(scope);
        ComboAdminController controller =
                new ComboAdminController(combos, locations, mock(LocationAccessService.class), users, resolver);

        controller.analyticsSummary(2L, authentication());

        verify(resolver).resolve(any(), eq(2L));
        verify(combos).getAnalyticsSummary(scope);
    }

    private static ComboAdminController controller(ComboService combos) {
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(2L)).thenReturn(Optional.of(
                Location.builder().id(2L).name("Meenakshi Towers")
                        .code("MEENAKSHI_TOWERS").active(true).build()));
        UserService users = mock(UserService.class);
        when(users.findByPhone("admin")).thenReturn(Optional.of(User.builder().build()));
        return new ComboAdminController(combos, locations,
                mock(LocationAccessService.class), users,
                mock(com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver.class));
    }

    private static Authentication authentication() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("admin");
        return authentication;
    }
}
