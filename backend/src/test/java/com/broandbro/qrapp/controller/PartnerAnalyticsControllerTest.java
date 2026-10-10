package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.analytics.dto.PartnerAnalyticsOverviewResponse;
import com.broandbro.qrapp.analytics.service.PartnerAnalyticsService;
import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.security.TokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PartnerAnalyticsController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class PartnerAnalyticsControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PartnerAnalyticsService analyticsService;
    @MockBean TokenAuthFilter tokenAuthFilter;

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserCanReadScopedOverview() throws Exception {
        when(analyticsService.overview(any(), eq(12L), any(), any())).thenReturn(emptyOverview());

        mvc.perform(get("/api/v1/partner/analytics/overview")
                        .param("locationId", "12")
                        .param("startDate", "2026-10-01")
                        .param("endDate", "2026-10-08"))
                .andExpect(status().isOk());

        verify(analyticsService).overview(any(), eq(12L), any(), any());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void nonPartnerRoleIsDenied() throws Exception {
        mvc.perform(get("/api/v1/partner/analytics/overview"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(analyticsService);
    }

    private PartnerAnalyticsOverviewResponse emptyOverview() {
        return new PartnerAnalyticsOverviewResponse(
                new PartnerAnalyticsOverviewResponse.Summary(BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, 0, BigDecimal.ZERO),
                new PartnerAnalyticsOverviewResponse.Comparison(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
