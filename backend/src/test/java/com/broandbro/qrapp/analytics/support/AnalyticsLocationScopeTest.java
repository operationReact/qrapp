package com.broandbro.qrapp.analytics.support;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsLocationScopeTest {

    @Test
    void emptyOptionalMeansAllLocations() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.empty());
        assertThat(scope.allLocations()).isTrue();
        assertThat(scope.visible()).isTrue();
        assertThat(scope.locationIds()).isNotEmpty();
    }

    @Test
    void nullScopeIsTreatedAsAllLocations() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(null);
        assertThat(scope.allLocations()).isTrue();
        assertThat(scope.visible()).isTrue();
    }

    @Test
    void presentNonEmptyListRestrictsToThoseLocations() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.of(List.of(5L, 6L)));
        assertThat(scope.allLocations()).isFalse();
        assertThat(scope.visible()).isTrue();
        assertThat(scope.locationIds()).containsExactly(5L, 6L);
    }

    @Test
    void presentEmptyListMeansNothingVisible() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.of(List.of()));
        assertThat(scope.allLocations()).isFalse();
        assertThat(scope.visible()).isFalse();
        // Sentinel keeps the SQL IN clause parseable even though nothing is visible.
        assertThat(scope.locationIds()).isNotEmpty();
    }
}
