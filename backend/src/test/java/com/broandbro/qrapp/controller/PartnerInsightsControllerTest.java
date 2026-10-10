package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.analytics.dto.PartnerInsightsResponses;
import com.broandbro.qrapp.analytics.service.PartnerInsightsService;
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

@WebMvcTest(PartnerInsightsController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class PartnerInsightsControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PartnerInsightsService service;
    @MockBean TokenAuthFilter tokenAuthFilter;

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserCanReadInsightsWithLocationAndDateRange() throws Exception {
        when(service.overview(any(), eq(22L), any(), any())).thenReturn(emptyOverview());

        mvc.perform(get("/api/v1/partner/insights/overview")
                        .param("locationId", "22")
                        .param("startDate", "2026-10-01")
                        .param("endDate", "2026-10-08"))
                .andExpect(status().isOk());

        verify(service).overview(any(), eq(22L), eq(java.time.LocalDate.of(2026, 10, 1)),
                eq(java.time.LocalDate.of(2026, 10, 8)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotReadPartnerInsights() throws Exception {
        mvc.perform(get("/api/v1/partner/insights/overview"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    private PartnerInsightsResponses.Overview emptyOverview() {
        PartnerInsightsResponses.Summary summary = new PartnerInsightsResponses.Summary(
                0, 0, BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        return new PartnerInsightsResponses.Overview(summary,
                new PartnerInsightsResponses.Comparison(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
                List.of(), List.of());
    }
}
