package com.broandbro.qrapp.partnernotification;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.partnernotification.PartnerNotificationDtos.*;
import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import com.broandbro.qrapp.partnerportal.PartnerPortalExceptionHandler;
import com.broandbro.qrapp.security.TokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PartnerNotificationController.class)
@Import({SecurityConfig.class, PartnerPortalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class PartnerNotificationControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PartnerNotificationService service;
    @MockBean TokenAuthFilter tokenAuthFilter;

    private NotificationResponse sample(boolean read) {
        return new NotificationResponse(5L, PartnerNotificationType.SETTLEMENT_PAID, "Settlement 2026-09 marked as paid",
                "msg", "/partner/finance/settlements/9", 9L, read, read ? Instant.EPOCH : null, Instant.EPOCH);
    }

    @Test
    @WithMockUser(roles = "PARTNER_USER")
    void partnerUserCanListCountAndMarkOwnNotifications() throws Exception {
        when(service.list(any(), eq(true), eq(0), eq(20)))
                .thenReturn(new PageImpl<>(List.of(sample(false)), PageRequest.of(0, 20), 1));
        when(service.unreadCount(any())).thenReturn(new UnreadCountResponse(1));
        when(service.markRead(any(), eq(5L))).thenReturn(sample(true));
        when(service.markAllRead(any())).thenReturn(new MarkAllReadResponse(1));

        mvc.perform(get("/api/v1/partner/notifications").param("unreadOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].targetPath").value("/partner/finance/settlements/9"))
                .andExpect(jsonPath("$.content[0].read").value(false));
        mvc.perform(get("/api/v1/partner/notifications/unread-count"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unread").value(1));
        mvc.perform(patch("/api/v1/partner/notifications/5/read"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));
        mvc.perform(post("/api/v1/partner/notifications/read-all"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updated").value(1));
    }

    @Test
    @WithMockUser(roles = "PARTNER_ADMIN")
    void notificationOfAnotherUserOrPartnerIsNotFound() throws Exception {
        when(service.markRead(any(), eq(77L))).thenThrow(PartnerPortalException.notFound("notification_not_found"));
        mvc.perform(patch("/api/v1/partner/notifications/77/read")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("notification_not_found"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void nonPartnerRolesAreForbidden() throws Exception {
        mvc.perform(get("/api/v1/partner/notifications")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/partner/notifications/unread-count")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/partner/notifications/5/read")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/partner/notifications/read-all")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}