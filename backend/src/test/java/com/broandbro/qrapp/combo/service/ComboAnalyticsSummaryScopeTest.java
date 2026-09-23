package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.combo.dto.ComboAnalyticsSummaryResponse;
import com.broandbro.qrapp.combo.repository.ComboAnalyticsDailyRepository;
import com.broandbro.qrapp.combo.repository.ComboRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.PricingService;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies that combo analytics summary reads are location-scoped:
 * SUPER_ADMIN ("All Locations") aggregates across locations, restricted users are
 * bound to their assigned location(s), and a user with no visible location gets a
 * zeroed summary without hitting the database.
 */
class ComboAnalyticsSummaryScopeTest {

    private final ComboRepository comboRepo = mock(ComboRepository.class);
    private final ComboAnalyticsDailyRepository analyticsRepo = mock(ComboAnalyticsDailyRepository.class);

    private ComboServiceImpl service() {
        return new ComboServiceImpl(
                comboRepo, analyticsRepo,
                mock(CategoryRepository.class), mock(MenuRepository.class),
                mock(SignatureProductRepository.class),
                mock(ComboPricingService.class), mock(ComboAvailabilityService.class),
                mock(PricingService.class));
    }

    @Test
    void invisibleScopeReturnsZeroedSummaryWithoutTouchingRepositories() {
        AnalyticsLocationScope invisible = AnalyticsLocationScope.from(Optional.of(List.of()));

        ComboAnalyticsSummaryResponse response = service().getAnalyticsSummary(invisible);

        assertThat(response.totalCombos()).isZero();
        assertThat(response.totalRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.topSellingCombos()).isEmpty();
        verifyNoInteractions(comboRepo, analyticsRepo);
    }

    @Test
    void restrictedScopePassesLocationFilterToEveryQuery() {
        AnalyticsLocationScope scope = AnalyticsLocationScope.from(Optional.of(List.of(2L)));

        ComboRepository.ComboCountProjection counts = counts(3L, 2L, 1L, 1L, 0L);
        when(analyticsRepo.sumRevenueBetween(any(), any(), anyBoolean(), any())).thenReturn(new BigDecimal("100.00"));
        when(analyticsRepo.sumSavingsBetween(any(), any(), anyBoolean(), any())).thenReturn(new BigDecimal("15.00"));
        when(analyticsRepo.sumOrdersBetween(any(), any(), anyBoolean(), any())).thenReturn(7L);
        when(analyticsRepo.findTopCombos(any(), any(), anyBoolean(), any(), any())).thenReturn(List.of());
        when(comboRepo.countMetricsInScope(anyBoolean(), any())).thenReturn(counts);

        ComboAnalyticsSummaryResponse response = service().getAnalyticsSummary(scope);

        assertThat(response.totalRevenue()).isEqualByComparingTo("100.00");
        assertThat(response.totalOrders()).isEqualTo(7L);
        assertThat(response.totalCombos()).isEqualTo(3L);
        assertThat(response.activeCombos()).isEqualTo(2L);

        verify(analyticsRepo).sumRevenueBetween(any(), any(), eq(false), eq(List.of(2L)));
        verify(analyticsRepo).sumOrdersBetween(any(), any(), eq(false), eq(List.of(2L)));
        verify(analyticsRepo).findTopCombos(any(), any(), eq(false), eq(List.of(2L)), any());
        verify(comboRepo).countMetricsInScope(eq(false), eq(List.of(2L)));
    }

    @Test
    void superAdminScopeUsesAllLocationsFlag() {
        AnalyticsLocationScope allLocations = AnalyticsLocationScope.from(Optional.empty());

        ComboRepository.ComboCountProjection counts = counts(0L, 0L, 0L, 0L, 0L);
        when(analyticsRepo.sumRevenueBetween(any(), any(), anyBoolean(), any())).thenReturn(BigDecimal.ONE);
        when(analyticsRepo.findTopCombos(any(), any(), anyBoolean(), any(), any())).thenReturn(List.of());
        when(comboRepo.countMetricsInScope(anyBoolean(), any())).thenReturn(counts);

        service().getAnalyticsSummary(allLocations);

        verify(analyticsRepo).sumRevenueBetween(any(), any(), eq(true), any());
        verify(comboRepo).countMetricsInScope(eq(true), any());
    }

    private static ComboRepository.ComboCountProjection counts(
            Long total, Long active, Long featured, Long preorder, Long signature) {
        ComboRepository.ComboCountProjection projection = mock(ComboRepository.ComboCountProjection.class);
        when(projection.getTotalCombos()).thenReturn(total);
        when(projection.getActiveCombos()).thenReturn(active);
        when(projection.getFeaturedCombos()).thenReturn(featured);
        when(projection.getPreorderCombos()).thenReturn(preorder);
        when(projection.getSignatureCombos()).thenReturn(signature);
        return projection;
    }
}
