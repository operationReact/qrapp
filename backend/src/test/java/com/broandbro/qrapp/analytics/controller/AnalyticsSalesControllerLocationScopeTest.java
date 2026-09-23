package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.scheduler.DailySalesAggregationScheduler;
import com.broandbro.qrapp.analytics.service.SalesAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AnalyticsSalesControllerLocationScopeTest {

    private final SalesAnalyticsService salesService = mock(SalesAnalyticsService.class);
    private final DailySalesAggregationScheduler scheduler = mock(DailySalesAggregationScheduler.class);
    private final AnalyticsScopeResolver scopeResolver = mock(AnalyticsScopeResolver.class);
    private final AnalyticsSalesController controller =
            new AnalyticsSalesController(salesService, scheduler, scopeResolver);

    @Test
    void dailySeriesForwardsResolvedScopeToService() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.of(List.of(3L)));
        when(scopeResolver.resolve(any(), eq(3L))).thenReturn(scope);
        when(salesService.getDailySeries(any(), any(), eq(scope))).thenReturn(List.of());

        controller.getDailySeries(LocalDate.now().minusDays(5), LocalDate.now(), 3L, auth());

        verify(scopeResolver).resolve(any(), eq(3L));
        verify(salesService).getDailySeries(any(), any(), eq(scope));
    }

    @Test
    void summaryForwardsResolvedScopeToService() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.empty());
        when(scopeResolver.resolve(any(), eq(null))).thenReturn(scope);

        controller.getSummary(LocalDate.now().minusDays(5), LocalDate.now(), null, auth());

        verify(salesService).getDashboardSummary(any(), any(), eq(scope));
    }

    @Test
    void unauthorizedLocationRequestPropagatesAccessDenied() {
        when(scopeResolver.resolve(any(), eq(99L)))
                .thenThrow(new AccessDeniedException("location_access_denied"));

        assertThatThrownBy(() -> controller.getWeeklySummary(99L, auth()))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(salesService);
    }

    private static Authentication auth() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("admin");
        return authentication;
    }
}
