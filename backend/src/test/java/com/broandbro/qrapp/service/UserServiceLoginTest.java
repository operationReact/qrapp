package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceLoginTest {
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks UserService service;

    @Test
    void inactiveAccountCannotLogInEvenWithCorrectPassword() {
        User user = User.builder()
                .id(7L)
                .phone("deleted-user-7")
                .password("$2a$hash")
                .active(false)
                .build();
        when(userRepository.findByPhone("deleted-user-7")).thenReturn(Optional.of(user));

        assertNull(service.login("deleted-user-7", "secret"));
        verify(userRepository, never()).save(any(User.class));
    }
}
