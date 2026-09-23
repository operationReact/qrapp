package com.broandbro.qrapp.analytics.support;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AnalyticsScopeResolverTest {

    private final UserService userService = mock(UserService.class);
    private final LocationAccessService locationAccessService = mock(LocationAccessService.class);
    private final AnalyticsScopeResolver resolver =
            new AnalyticsScopeResolver(userService, locationAccessService);

    @Test
    void superAdminAllLocationsWhenNoLocationRequested() {
        User user = User.builder().build();
        when(userService.findByPhone("admin")).thenReturn(Optional.of(user));
        when(locationAccessService.resolveDashboardLocationScope(user, null))
                .thenReturn(Optional.empty());

        AnalyticsLocationScope scope = resolver.resolve(auth("admin"), null);

        assertThat(scope.allLocations()).isTrue();
        assertThat(scope.visible()).isTrue();
    }

    @Test
    void restrictedUserIsBoundToAccessibleLocations() {
        User user = User.builder().build();
        when(userService.findByPhone("manager")).thenReturn(Optional.of(user));
        when(locationAccessService.resolveDashboardLocationScope(user, 3L))
                .thenReturn(Optional.of(List.of(3L)));

        AnalyticsLocationScope scope = resolver.resolve(auth("manager"), 3L);

        assertThat(scope.allLocations()).isFalse();
        assertThat(scope.locationIds()).containsExactly(3L);
    }

    @Test
    void requestingUnauthorizedLocationPropagatesAccessDenied() {
        User user = User.builder().build();
        when(userService.findByPhone("manager")).thenReturn(Optional.of(user));
        when(locationAccessService.resolveDashboardLocationScope(user, 99L))
                .thenThrow(new AccessDeniedException("location_access_denied"));

        assertThatThrownBy(() -> resolver.resolve(auth("manager"), 99L))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("location_access_denied");
    }

    @Test
    void missingAuthenticationIsRejected() {
        assertThatThrownBy(() -> resolver.resolve(null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("authentication_required");
        verifyNoInteractions(locationAccessService);
    }

    @Test
    void unknownUserIsRejected() {
        when(userService.findByPhone("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resolver.resolve(auth("ghost"), null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("authentication_required");
    }

    private static Authentication auth(String name) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(name);
        return authentication;
    }
}
