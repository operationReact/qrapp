package com.broandbro.qrapp.analytics.support;

import java.util.List;
import java.util.Optional;

/**
 * Normalised location scope for analytics reads.
 *
 * <p>Bridges {@link com.broandbro.qrapp.service.LocationAccessService#resolveDashboardLocationScope}
 * (which returns {@code Optional<List<Long>>}) into flat parameters that every
 * analytics repository query can consume uniformly:
 * <ul>
 *   <li>{@link #allLocations()} — {@code true} means "no location filter"
 *       (SUPER_ADMIN viewing all locations). Queries use the guard
 *       {@code (:allLocations = TRUE OR x.location_id IN :locationIds)}.</li>
 *   <li>{@link #locationIds()} — the concrete IDs to restrict to. Never empty
 *       (a sentinel {@code -1} is used when {@code allLocations} is true or when
 *       the caller can see nothing) so the SQL {@code IN} clause always parses.</li>
 *   <li>{@link #visible()} — {@code false} when the user has access to no
 *       location at all; callers should short-circuit and return empty results
 *       without touching the database.</li>
 * </ul>
 *
 * <p>This keeps the read path safe for MANAGER/ADMIN (restricted to their
 * assignments) while preserving the SUPER_ADMIN cross-location capability.</p>
 */
public record AnalyticsLocationScope(boolean allLocations, List<Long> locationIds, boolean visible) {

    private static final List<Long> SENTINEL = List.of(-1L);

    public static AnalyticsLocationScope from(Optional<List<Long>> scope) {
        if (scope == null || scope.isEmpty()) {
            // SUPER_ADMIN / "All Locations": no filter.
            return new AnalyticsLocationScope(true, SENTINEL, true);
        }
        List<Long> ids = scope.get();
        if (ids.isEmpty()) {
            // User can access no location — see nothing.
            return new AnalyticsLocationScope(false, SENTINEL, false);
        }
        return new AnalyticsLocationScope(false, List.copyOf(ids), true);
    }
}
