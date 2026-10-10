package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.dto.CreatePartnerUserRequest;
import com.broandbro.qrapp.dto.PartnerInvitationResponse;
import com.broandbro.qrapp.dto.PartnerSummaryResponse;
import com.broandbro.qrapp.service.PartnerService;
import com.broandbro.qrapp.security.TokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PartnerController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class PartnerControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean PartnerService partnerService;
    @MockBean TokenAuthFilter tokenAuthFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void ordinaryAdminCannotManagePartners() throws Exception {
        mockMvc.perform(get("/api/v1/partners"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(partnerService);
    }

    @Test
    @WithMockUser(roles = "SUPERUSER")
    void legacySuperUserCannotMutatePartners() throws Exception {
        mockMvc.perform(post("/api/v1/partners")
                        .contentType("application/json")
                .content("{\"partnerCode\":\"TEST\",\"legalName\":\"Test\",\"displayName\":\"Test\",\"primaryContactName\":\"Owner\",\"primaryContactEmail\":\"owner@example.test\",\"primaryContactPhone\":\"9876543210\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(partnerService);
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanListPartners() throws Exception {
        when(partnerService.list()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/partners"))
                .andExpect(status().isOk());
        verify(partnerService).list();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanCreatePartnerUser() throws Exception {
        when(partnerService.createUser(eq(2L), any(CreatePartnerUserRequest.class)))
                .thenReturn(new PartnerInvitationResponse("9876543210", "temporary-password", "created"));

        mockMvc.perform(post("/api/v1/partners/2/users/create")
                        .contentType("application/json")
                        .content("{\"name\":\"Partner Admin\",\"phone\":\"9876543210\",\"role\":\"PARTNER_ADMIN\"}"))
                .andExpect(status().isCreated());

        verify(partnerService).createUser(eq(2L), any(CreatePartnerUserRequest.class));
    }
}
