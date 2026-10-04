package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.config.SecurityConfig;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({LocationController.class, SuperAdminLocationController.class})
@Import({SecurityConfig.class, LocationAccessService.class})
@AutoConfigureMockMvc
class LocationSecurityFilterChainTest {
    @Autowired MockMvc mvc;
    @MockBean UserService users;
    @MockBean LocationRepository locations;
    @MockBean UserLocationAccessRepository accesses;
    @MockBean UserRepository userRepository;
    @MockBean com.broandbro.qrapp.service.LocationCodeService locationCodeService;
    @MockBean com.broandbro.qrapp.service.LocationPhotoService locationPhotoService;
    @MockBean com.broandbro.qrapp.service.LocationDeletionService locationDeletionService;

    private final Location a = Location.builder().id(1L).code("A").name("A").active(true).build();
    private final Location b = Location.builder().id(2L).code("B").name("B").active(true).build();
    private User superAdmin, admin, manager, managerB, kitchen, kitchenB;

    @BeforeEach
    void setUp() {
        superAdmin = user(1L, "super", UserRole.SUPER_ADMIN, "super-token");
        admin = user(2L, "admin", UserRole.ADMIN, "admin-token");
        manager = user(3L, "manager", UserRole.MANAGER, "manager-token");
        kitchen = user(4L, "kitchen", UserRole.KITCHEN_STAFF, "kitchen-token");
        managerB = user(5L, "manager-b", UserRole.MANAGER, "manager-b-token");
        kitchenB = user(6L, "kitchen-b", UserRole.KITCHEN_STAFF, "kitchen-b-token");
        when(users.findByToken(any())).thenAnswer(i -> switch ((String) i.getArgument(0)) {
            case "super-token" -> Optional.of(superAdmin);
            case "admin-token" -> Optional.of(admin);
            case "manager-token" -> Optional.of(manager);
            case "manager-b-token" -> Optional.of(managerB);
            case "kitchen-token" -> Optional.of(kitchen);
            case "kitchen-b-token" -> Optional.of(kitchenB);
            default -> Optional.empty();
        });
        when(users.findByPhone(any())).thenAnswer(i -> switch ((String) i.getArgument(0)) {
            case "super" -> Optional.of(superAdmin);
            case "admin" -> Optional.of(admin);
            case "manager" -> Optional.of(manager);
            case "manager-b" -> Optional.of(managerB);
            case "kitchen" -> Optional.of(kitchen);
            case "kitchen-b" -> Optional.of(kitchenB);
            default -> Optional.empty();
        });
        when(locations.findById(1L)).thenReturn(Optional.of(a));
        when(locations.findById(2L)).thenReturn(Optional.of(b));
    }

    @Test
    void unauthenticatedAndNonSuperAdminManagementAreRejected() throws Exception {
        mvc.perform(get("/api/locations/1/authorized")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users").header("Authorization", bearer("admin-token")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUsersCanReadPublicLocations() throws Exception {
        when(locations.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(a, b));

        mvc.perform(get("/api/locations/public"))
                .andExpect(status().isOk());
    }

    @Test
    void superAdminCanCreateLocation() throws Exception {
        Location created = Location.builder().id(3L).code("new-location").name("New Location")
                .active(true).build();
        when(locationCodeService.create(any(Location.class), any())).thenReturn(created);

        mvc.perform(post("/api/admin/locations")
                        .header("Authorization", bearer("super-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"New Location","addressLine1":"Somewhere","city":"Hyderabad","district":"Hyderabad","stateUt":"Telangana","pinCode":"500001","active":true}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void superAdminAccessesAllLocationsWhileAdminIsScopedToAssignments() throws Exception {
        // SUPER_ADMIN retains global, cross-location access.
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("super-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("super-token")))
                .andExpect(status().isOk());

        // ADMIN is now bound to explicit user_location_access assignments: granted
        // location 1 only, so location 2 is forbidden.
        when(accesses.findByUserIdAndLocationId(2L, 1L)).thenReturn(Optional.of(grant(admin, a)));
        when(accesses.findByUserIdAndLocationId(2L, 2L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("admin-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("admin-token")))
                .andExpect(status().isForbidden());
    }

    @Test
    void assignedAndUnassignedManagerAndKitchenAccessIsEnforced() throws Exception {
        when(accesses.findByUserIdAndLocationId(3L, 1L)).thenReturn(Optional.of(grant(manager, a)));
        when(accesses.findByUserIdAndLocationId(4L, 2L)).thenReturn(Optional.of(grant(kitchen, b)));
        when(accesses.findByUserIdAndLocationId(5L, 2L)).thenReturn(Optional.of(grant(managerB, b)));
        when(accesses.findByUserIdAndLocationId(6L, 1L)).thenReturn(Optional.of(grant(kitchenB, a)));

        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("manager-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("manager-token")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("kitchen-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("kitchen-token")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("manager-b-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("manager-b-token")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("kitchen-b-token")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/2/authorized").header("Authorization", bearer("kitchen-b-token")))
                .andExpect(status().isForbidden());
    }

    @Test
    void liveGrantThenRevokeChangesAuthorization() throws Exception {
        User target = manager;
        when(userRepository.findById(3L)).thenReturn(Optional.of(target));
        when(accesses.findByUserIdAndLocationId(3L, 1L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(grant(target, a)));
        when(accesses.save(any(UserLocationAccess.class))).thenAnswer(i -> i.getArgument(0));

        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("manager-token")))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/users/3/locations/1").header("Authorization", bearer("super-token"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("manager-token")))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/admin/users/3/locations/1").header("Authorization", bearer("super-token")))
                .andExpect(status().isNoContent());
        when(accesses.findByUserIdAndLocationId(3L, 1L))
                .thenReturn(Optional.of(UserLocationAccess.builder().user(target).location(a).active(false).build()));
        mvc.perform(get("/api/locations/1/authorized").header("Authorization", bearer("manager-token")))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidAndInactiveLocationsAreRejected() throws Exception {
        when(locations.findById(99L)).thenReturn(Optional.empty());
        Location inactive = Location.builder().id(3L).active(false).build();
        when(locations.findById(3L)).thenReturn(Optional.of(inactive));
        for (String token : new String[]{"super-token", "admin-token"}) {
            mvc.perform(get("/api/locations/99/authorized").header("Authorization", bearer(token)))
                    .andExpect(status().isForbidden());
            mvc.perform(get("/api/locations/3/authorized").header("Authorization", bearer(token)))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void managerAndKitchenCannotGrantOrModifyAccess() throws Exception {
        when(userRepository.findById(3L)).thenReturn(Optional.of(manager));
        mvc.perform(put("/api/admin/users/3/locations/1").header("Authorization", bearer("manager-token"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/users/4/locations/1").header("Authorization", bearer("kitchen-token"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isForbidden());
    }

    private User user(Long id, String phone, UserRole role, String token) {
        return User.builder().id(id).phone(phone).role(role).token(token)
                .isAdmin(role == UserRole.ADMIN || role == UserRole.SUPER_ADMIN)
                .isSuperUser(role == UserRole.SUPER_ADMIN).build();
    }

    private UserLocationAccess grant(User user, Location location) {
        return UserLocationAccess.builder().user(user).location(location).active(true).build();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
