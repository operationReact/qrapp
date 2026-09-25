package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateUserRequest;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class UserServiceInternalUserTest {
    @Mock UserRepository users;
    @Mock WalletRepository wallets;
    @Mock org.springframework.security.crypto.password.PasswordEncoder encoder;
    @Mock LocationRepository locations;
    @Mock UserLocationAccessRepository accesses;
    @Mock CustomerCompanyService companies;
    @Mock LocationAccessService locationAccess;
    @Mock com.broandbro.qrapp.config.LegalProperties legalProperties;

    @InjectMocks UserService service;

    @Test
    void createsHashedInternalUserAndLocationGrant() {
        Location location = Location.builder().id(4L).name("Active").active(true).build();
        CreateUserRequest request = new CreateUserRequest();
        request.setName(" Staff User ");
        request.setPhone("+91 9876543210");
        request.setPassword("secret");
        request.setRole(UserRole.MANAGER);
        request.setLocationId(4L);
        when(users.findByPhone("+919876543210")).thenReturn(Optional.empty());
        when(locations.findById(4L)).thenReturn(Optional.of(location));
        when(encoder.encode("secret")).thenReturn("$2a$hashed");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(8L);
            return saved;
        });

        service.createInternalUser(request);

        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);
        verify(users).save(user.capture());
        assertEquals("$2a$hashed", user.getValue().getPassword());
        assertEquals(UserRole.MANAGER, user.getValue().getRole());
        assertEquals(location, user.getValue().getDefaultLocation());
        verify(accesses).save(any(UserLocationAccess.class));
        verify(wallets).save(any(Wallet.class));
    }

    @Test
    void rejectsInvalidPhone() {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Staff User");
        request.setPhone("12345");
        request.setPassword("secret");
        request.setRole(UserRole.MANAGER);
        request.setLocationId(4L);

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> service.createInternalUser(request));
        verifyNoInteractions(users, locations, encoder, accesses, wallets);
    }

    @Test
    void rejectsCustomerAndSuperAdminRoles() {
        for (UserRole role : new UserRole[]{UserRole.CUSTOMER, UserRole.SUPER_ADMIN}) {
            CreateUserRequest request = new CreateUserRequest();
            request.setName("Staff User");
            request.setPhone("9876543210");
            request.setPassword("secret");
            request.setRole(role);
            request.setLocationId(4L);

            org.junit.jupiter.api.Assertions.assertThrows(
                    IllegalArgumentException.class,
                    () -> service.createInternalUser(request));
        }
        verifyNoInteractions(users, locations, encoder, accesses, wallets);
    }

    @Test
    void loginAcceptsTheTenDigitPhoneUsedDuringCreation() {
        User user = User.builder()
                .id(8L)
                .phone("+919876543210")
                .password("$2a$hashed")
                .build();
        when(users.findByPhone("9876543210")).thenReturn(Optional.empty());
        when(users.findByPhone("+919876543210")).thenReturn(Optional.of(user));
        when(encoder.matches("secret", "$2a$hashed")).thenReturn(true);
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        org.junit.jupiter.api.Assertions.assertNotNull(service.login("9876543210", "secret"));
        verify(users).findByPhone("+919876543210");
    }
}
