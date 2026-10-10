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
import java.util.List;

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
    @MockBean com.broandbro.qrapp.service.LocationCodeService locationCodeService;
    @MockBean com.broandbro.qrapp.security.TokenAuthFilter tokenAuthFilter;
    @MockBean com.broandbro.qrapp.service.LocationPhotoService locationPhotoService;
    @MockBean com.broandbro.qrapp.service.LocationDeletionService locationDeletionService;
    @MockBean com.broandbro.qrapp.service.PartnerService partnerService;
    @MockBean com.broandbro.qrapp.repository.PartnerLocationRepository partnerLocationRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void ordinaryAdminCannotUseSuperAdminManagement() throws Exception {
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isForbidden());
        verifyNoInteractions(userRepository);
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanFilterUsersByLocation() throws Exception {
        when(userService.findByPhone("user")).thenReturn(Optional.of(
                User.builder().phone("user").role(UserRole.SUPER_ADMIN).build()));
        when(userRepository.findAllByLocationId(3L)).thenReturn(List.of(
                User.builder().id(2L).phone("9876543210").name("Location User")
                        .role(UserRole.MANAGER).build()));

        mockMvc.perform(get("/api/admin/users").param("locationId", "3"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$[0].name").value("Location User"));

        verify(userRepository).findAllByLocationId(3L);
        verify(userRepository, never()).findAll();
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
    void superAdminCanDeactivateLocation() throws Exception {
        User actor = User.builder().id(1L).phone("user").role(UserRole.SUPER_ADMIN).build();
        Location location = Location.builder().id(3L).code("A").name("A").active(true).build();
        when(userService.findByPhone("user")).thenReturn(Optional.of(actor));
        when(locationRepository.findById(3L)).thenReturn(Optional.of(location));
        when(locationRepository.save(any(Location.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(patch("/api/admin/locations/3/active").param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.active").value(false));

        verify(locationRepository).save(argThat(saved -> !Boolean.TRUE.equals(saved.getActive())));
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

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void createUserRejectsInvalidPhoneBeforeService() throws Exception {
        when(userService.findByPhone("user")).thenReturn(Optional.of(
                User.builder().phone("user").role(UserRole.SUPER_ADMIN).build()));

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A User\",\"phone\":\"12345\",\"password\":\"x\",\"role\":\"ADMIN\",\"locationId\":3}"))
                .andExpect(status().isBadRequest());
        verify(userService, never()).createInternalUser(any());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void createUserReturnsCreatedWithoutPassword() throws Exception {
        when(userService.findByPhone("user")).thenReturn(Optional.of(
                User.builder().phone("user").role(UserRole.SUPER_ADMIN).build()));
        when(userService.createInternalUser(any())).thenReturn(
                new com.broandbro.qrapp.dto.UserResponse());

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A User\",\"phone\":\"9876543210\",\"password\":\"secret\",\"role\":\"MANAGER\",\"locationId\":3}"))
                .andExpect(status().isCreated())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.password").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void createUserReturnsConflictForDuplicatePhone() throws Exception {
        when(userService.findByPhone("user")).thenReturn(Optional.of(
                User.builder().phone("user").role(UserRole.SUPER_ADMIN).build()));
        when(userService.createInternalUser(any()))
                .thenThrow(new IllegalArgumentException("phone_taken"));

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A User\",\"phone\":\"9876543210\",\"password\":\"secret\",\"role\":\"MANAGER\",\"locationId\":3}"))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void createOptionsExposeOnlyInternalAssignableRoles() throws Exception {
        when(userService.findByPhone("user")).thenReturn(Optional.of(
                User.builder().phone("user").role(UserRole.SUPER_ADMIN).build()));
        when(locationRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users/create-options"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.roles[0]").value("ADMIN"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.roles[1]").value("MANAGER"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.roles[2]").value("KITCHEN_STAFF"));
    }

}
