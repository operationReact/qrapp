package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SuperAdminLocationController.class)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class SuperAdminLocationControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean LocationRepository locationRepository;
    @MockBean UserRepository userRepository;
    @MockBean UserLocationAccessRepository accessRepository;
    @MockBean UserService userService;
    @MockBean LocationAccessService accessService;
    @MockBean com.broandbro.qrapp.security.TokenAuthFilter tokenAuthFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void ordinaryAdminCannotUseSuperAdminManagement() throws Exception {
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isForbidden());
        verifyNoInteractions(userRepository);
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanGrantAndRevokeAssignedLocation() throws Exception {
        User actor = User.builder().id(1L).phone("user").role(UserRole.SUPER_ADMIN).build();
        User target = User.builder().id(2L).phone("target").role(UserRole.MANAGER).build();
        Location location = Location.builder().id(3L).code("A").name("A").active(true).build();
        when(userService.findByPhone("user")).thenReturn(Optional.of(actor));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(locationRepository.findById(3L)).thenReturn(Optional.of(location));
        when(accessRepository.findByUserIdAndLocationId(2L, 3L)).thenReturn(Optional.empty());
        when(accessRepository.save(any(UserLocationAccess.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/admin/users/2/locations/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/admin/users/2/locations/3"))
                .andExpect(status().isNoContent());
        verify(accessRepository).save(any(UserLocationAccess.class));
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCannotGrantAccessToSelf() throws Exception {
        User actor = User.builder().id(1L).phone("user").role(UserRole.SUPER_ADMIN).build();
        when(userService.findByPhone("user")).thenReturn(Optional.of(actor));
        when(userRepository.findById(1L)).thenReturn(Optional.of(actor));
        doThrow(new org.springframework.security.access.AccessDeniedException("self"))
                .when(accessService).requireNotSelf(any(), any());

        mockMvc.perform(put("/api/admin/users/1/locations/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":true}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(accessRepository);
    }

}
