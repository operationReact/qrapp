package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import com.broandbro.qrapp.partnerportal.PartnerPortalExceptionHandler;
import com.broandbro.qrapp.partnerreports.PartnerReportDtos.ReportFile;
import com.broandbro.qrapp.security.TokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PartnerReportController.class)
@Import({SecurityConfig.class, PartnerPortalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class PartnerReportControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PartnerReportService service;
    @MockBean TokenAuthFilter tokenAuthFilter;

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserDownloadsCsvWithSafeHeaders() throws Exception {
        when(service.csv(any(), eq("sales"), eq(7L), isNull(), any(), any()))
                .thenReturn(new ReportFile("r.csv", "text/csv;charset=UTF-8", "a\r\n".getBytes()));

        mvc.perform(get("/api/v1/partner/reports/sales/export.csv")
                        .param("locationId", "7").param("from", "2026-10-01").param("to", "2026-10-08"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"r.csv\""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));

        verify(service).csv(any(), eq("sales"), eq(7L), isNull(), eq(LocalDate.of(2026, 10, 1)),
                eq(LocalDate.of(2026, 10, 8)));
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void legacyStartEndDateAliasesAreAccepted() throws Exception {
        mvc.perform(get("/api/v1/partner/reports/sales/summary")
                        .param("startDate", "2026-10-01").param("endDate", "2026-10-08"))
                .andExpect(status().isOk());
        verify(service).summary(any(), eq("sales"), isNull(), isNull(), eq(LocalDate.of(2026, 10, 1)),
                eq(LocalDate.of(2026, 10, 8)));
    }

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void executivePdfIsServedAsAttachment() throws Exception {
        when(service.executivePdf(any(), any(), any(), any(), any()))
                .thenReturn(new ReportFile("e.pdf", "application/pdf", new byte[]{'%', 'P', 'D', 'F'}));
        mvc.perform(get("/api/v1/partner/reports/executive.pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"));
    }

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void businessRuleFailuresMapToClientErrors() throws Exception {
        when(service.summary(any(), eq("feedback"), any(), any(), any(), any())).thenThrow(new AccessDeniedException("x"));
        when(service.csv(any(), eq("feedback"), any(), any(), any(), any()))
                .thenThrow(PartnerPortalException.unavailable("report_unavailable"));
        when(service.summary(any(), eq("bogus"), any(), any(), any(), any()))
                .thenThrow(PartnerPortalException.notFound("report_type_not_found"));

        mvc.perform(get("/api/v1/partner/reports/feedback/summary")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/reports/feedback/export.csv")).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("report_unavailable"));
        mvc.perform(get("/api/v1/partner/reports/bogus/summary")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/partner/reports/sales/summary").param("from", "not-a-date"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void nonPartnerRolesAreForbiddenEverywhere() throws Exception {
        mvc.perform(get("/api/v1/partner/reports")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/reports/sales/summary")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/reports/sales/export.csv")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/reports/executive.pdf")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}