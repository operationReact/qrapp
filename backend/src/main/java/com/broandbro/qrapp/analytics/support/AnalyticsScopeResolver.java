package com.broandbro.qrapp.analytics.support;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Resolves the {@link AnalyticsLocationScope} for an analytics request from the
 * authenticated principal and an optional requested {@code locationId} query param.
 *
 * <p>Reuses {@link LocationAccessService#resolveDashboardLocationScope} — the same
 * primitive used by the order dashboard / live queue / pre-order surfaces — so
 * analytics authorization stays consistent:
 * <ul>
 *   <li>SUPER_ADMIN with no {@code locationId}: all locations (no filter).</li>
 *   <li>SUPER_ADMIN with {@code locationId}: that single (active) location.</li>
 *   <li>ADMIN / MANAGER: restricted to their accessible/assigned locations; a
 *       requested location is validated and rejected with 403 when not permitted.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AnalyticsScopeResolver {

    private final UserService userService;
    private final LocationAccessService locationAccessService;

    public AnalyticsLocationScope resolve(Authentication authentication, Long requestedLocationId) {
        User user = requireUser(authentication);
        Optional<List<Long>> scope =
                locationAccessService.resolveDashboardLocationScope(user, requestedLocationId);
        return AnalyticsLocationScope.from(scope);
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}
