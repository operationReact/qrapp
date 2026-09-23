package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.repository.DailySalesAnalyticsRepository;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SalesAnalyticsServiceImplScopeTest {

    private final DailySalesAnalyticsRepository repo = mock(DailySalesAnalyticsRepository.class);
    private final SalesAnalyticsServiceImpl service = new SalesAnalyticsServiceImpl(repo);

    /** A user with no accessible location must never hit the database and must see nothing. */
    @Test
    void notVisibleScopeShortCircuitsWithoutQuerying() {
        AnalyticsLocationScope none = AnalyticsLocationScope.from(Optional.of(List.of()));

        List<DailySalesResponse> series = service.getDailySeries(LocalDate.now().minusDays(3), LocalDate.now(), none);
        DashboardSummaryResponse summary = service.getDashboardSummary(LocalDate.now().minusDays(3), LocalDate.now(), none);

        assertThat(series).isEmpty();
        assertThat(summary).isNotNull();
        verifyNoInteractions(repo);
    }

    /** A restricted scope forwards its location IDs to the repository. */
    @Test
    void restrictedScopeForwardsLocationIdsToRepository() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.of(List.of(7L)));
        when(repo.findSummaryByDateRange(any(), any(), eq(false), eq(List.of(7L))))
                .thenReturn(List.of());

        service.getDailySeries(LocalDate.now().minusDays(3), LocalDate.now(), scope);

        verify(repo).findSummaryByDateRange(any(), any(), eq(false), eq(List.of(7L)));
    }
}
