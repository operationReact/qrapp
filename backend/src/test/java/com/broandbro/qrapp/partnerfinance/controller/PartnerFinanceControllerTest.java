package com.broandbro.qrapp.partnerfinance.controller;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.AdminAgreementResponse;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.SettlementDetailResponse;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.service.PartnerAgreementService;
import com.broandbro.qrapp.partnerfinance.service.PartnerSettlementService;
import com.broandbro.qrapp.security.TokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({PartnerFinanceController.class, PartnerCommissionAgreementAdminController.class})
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class PartnerFinanceControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PartnerSettlementService settlements;
    @MockBean PartnerAgreementService agreements;
    @MockBean TokenAuthFilter tokenAuthFilter;

    private static final String GENERATE = "{\"period\":\"2026-09\"}";

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserCanReadSettlementsAndAgreements() throws Exception {
        when(settlements.list(any(), isNull(), eq(0), eq(20))).thenReturn(Page.empty());
        when(agreements.listForPartner(any())).thenReturn(List.of());
        mvc.perform(get("/api/v1/partner/finance/settlements")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/partner/finance/agreements")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserCannotMutateAnything() throws Exception {
        mvc.perform(post("/api/v1/partner/finance/settlements").contentType(MediaType.APPLICATION_JSON).content(GENERATE))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/recalculate")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/approve")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/adjustments").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"MANUAL_CREDIT\",\"amount\":1.00,\"reason\":\"abc\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/mark-paid").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReference\":\"UTR\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/void").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"abc\"}"))
                .andExpect(status().isForbidden());
        verify(settlements, never()).generate(any(), any());
        verify(settlements, never()).approve(any(), any());
        verify(settlements, never()).markPaid(any(), any(), any());
        verify(settlements, never()).voidSettlement(any(), any(), any());
        verify(settlements, never()).addAdjustment(any(), any(), any());
        verify(settlements, never()).recalculate(any(), any());
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void partnerAdminCanGenerateAndApprove() throws Exception {
        SettlementDetailResponse detail = new SettlementDetailResponse(null, List.of());
        when(settlements.generate(any(), any())).thenReturn(detail);
        when(settlements.approve(any(), eq(1L))).thenReturn(detail);
        mvc.perform(post("/api/v1/partner/finance/settlements").contentType(MediaType.APPLICATION_JSON).content(GENERATE))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/approve")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void invalidRequestBodiesAreRejectedBeforeReachingTheService() throws Exception {
        mvc.perform(post("/api/v1/partner/finance/settlements").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/adjustments").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"MANUAL_CREDIT\",\"amount\":0,\"reason\":\"abc\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/partner/finance/settlements/1/adjustments").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NOPE\",\"amount\":1,\"reason\":\"abc\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(settlements);
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void domainErrorsMapToTheirHttpStatus() throws Exception {
        when(settlements.detail(any(), eq(404L))).thenThrow(PartnerFinanceException.notFound("settlement_not_found"));
        when(settlements.approve(any(), eq(9L))).thenThrow(PartnerFinanceException.conflict("settlement_not_calculated"));
        when(settlements.recalculate(any(), eq(8L))).thenThrow(new AccessDeniedException("partner_admin_required"));
        mvc.perform(get("/api/v1/partner/finance/settlements/404")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("settlement_not_found"));
        mvc.perform(post("/api/v1/partner/finance/settlements/9/approve")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("settlement_not_calculated"));
        mvc.perform(post("/api/v1/partner/finance/settlements/8/recalculate")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void statementIsServedAsPdfAttachment() throws Exception {
        when(settlements.statement(any(), eq(3L))).thenReturn(
                new PartnerSettlementService.StatementFile("settlement-2026-09-3.pdf", "%PDF-1.7".getBytes()));
        mvc.perform(get("/api/v1/partner/finance/settlements/3/statement.pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"settlement-2026-09-3.pdf\""));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void nonPartnerRolesAreDenied() throws Exception {
        mvc.perform(get("/api/v1/partner/finance/settlements")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/finance/summary")).andExpect(status().isForbidden());
        verifyNoInteractions(settlements);
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void partnerAdminCannotManageCommissionAgreements() throws Exception {
        mvc.perform(get("/api/v1/partners/5/commission-agreements")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":10,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(agreements);
    }

    @Test
    @WithMockUser(roles = "SUPERUSER")
    void superUserCanReadButNotChangeAgreements() throws Exception {
        when(agreements.listForAdmin(5L)).thenReturn(List.<AdminAgreementResponse>of());
        mvc.perform(get("/api/v1/partners/5/commission-agreements")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":10,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCreatesAgreementsAndInvalidRatesAreRejected() throws Exception {
        when(agreements.create(eq(5L), any(), any())).thenReturn(
                new AdminAgreementResponse(1L, 5L, null, null, null, null, null, null, null, null, null, null, null, null, null));
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":12.5,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":100.5,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":0,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/partners/5/commission-agreements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commissionBasis\":\"NET_SALES\",\"ratePercent\":10.12345,\"effectiveFrom\":\"2026-01-01\"}"))
                .andExpect(status().isBadRequest());
        verify(agreements, times(1)).create(any(), any(), any());
    }
}