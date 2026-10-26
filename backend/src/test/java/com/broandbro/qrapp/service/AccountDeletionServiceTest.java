package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.exception.AccountDeletionException;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.PartnerUserRepository;
import com.broandbro.qrapp.repository.PasswordResetAuthorizationRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WhatsAppOtpRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {
    @Mock UserRepository userRepository;
    @Mock WalletRepository walletRepository;
    @Mock OrderRepository orderRepository;
    @Mock PartnerUserRepository partnerUserRepository;
    @Mock WhatsAppOtpRepository whatsAppOtpRepository;
    @Mock PasswordResetAuthorizationRepository passwordResetAuthorizationRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserService userService;

    @InjectMocks AccountDeletionService service;

    private User customer() {
        User user = User.builder()
                .id(42L)
                .phone("+919876543210")
                .password("$2a$stored")
                .name("Asha")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .specialDate(LocalDate.of(2020, 5, 5))
                .specialDayType("Birthday")
                .specialDayCustomLabel("label")
                .token("bearer-token")
                .role(UserRole.CUSTOMER)
                .isAdmin(false)
                .isSuperUser(false)
                .active(true)
                .build();
        return user;
    }

    private Order order(OrderStatus status) {
        Order order = new Order();
        order.setStatus(status);
        order.setPhone("+919876543210");
        return order;
    }

    @Test
    void deletesCustomerAccountAndScrubsPersonalData() {
        User user = customer();
        Order completed = order(OrderStatus.COMPLETED);
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "$2a$stored")).thenReturn(true);
        when(orderRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(42L)).thenReturn(List.of(completed));
        when(walletRepository.findByUserId(42L)).thenReturn(Optional.of(
                Wallet.builder().user(user).balance(BigDecimal.ZERO).build()));
        when(passwordEncoder.encode(any())).thenReturn("$2a$random");

        service.deleteAccount(42L, "secret");

        verify(userService).invalidateToken(user);
        verify(whatsAppOtpRepository).deleteByPhoneNumber("+919876543210");
        verify(passwordResetAuthorizationRepository).deleteByPhoneNumber("+919876543210");
        assertEquals(AccountDeletionService.DELETED_PHONE_PLACEHOLDER, completed.getPhone());
        assertEquals("deleted-user-42", user.getPhone());
        assertEquals("$2a$random", user.getPassword());
        assertNull(user.getName());
        assertNull(user.getDateOfBirth());
        assertNull(user.getSpecialDate());
        assertNull(user.getSpecialDayType());
        assertNull(user.getSpecialDayCustomLabel());
        assertNull(user.getToken());
        assertFalse(user.getActive());
        verify(userRepository).save(user);
    }

    @Test
    void rejectsWrongPasswordWithoutChangingAccount() {
        User user = customer();
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "$2a$stored")).thenReturn(false);

        AccountDeletionException ex = assertThrows(AccountDeletionException.class,
                () -> service.deleteAccount(42L, "wrong"));

        assertEquals("invalid_password", ex.getCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("+919876543210", user.getPhone());
        verify(userRepository, never()).save(any());
        verify(userService, never()).invalidateToken(any());
    }

    @Test
    void blocksDeletionWhileOrderIsOpen() {
        User user = customer();
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "$2a$stored")).thenReturn(true);
        when(orderRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(42L))
                .thenReturn(List.of(order(OrderStatus.PREPARING)));

        AccountDeletionException ex = assertThrows(AccountDeletionException.class,
                () -> service.deleteAccount(42L, "secret"));

        assertEquals("active_orders_exist", ex.getCode());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    void blocksDeletionWhenWalletHasBalance() {
        User user = customer();
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "$2a$stored")).thenReturn(true);
        when(orderRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(42L)).thenReturn(List.of());
        when(walletRepository.findByUserId(42L)).thenReturn(Optional.of(
                Wallet.builder().user(user).balance(new BigDecimal("12.50")).build()));

        AccountDeletionException ex = assertThrows(AccountDeletionException.class,
                () -> service.deleteAccount(42L, "secret"));

        assertEquals("wallet_balance_remaining", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void blocksSelfDeletionForStaffAccounts() {
        User user = customer();
        user.setRole(UserRole.MANAGER);
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "$2a$stored")).thenReturn(true);

        AccountDeletionException ex = assertThrows(AccountDeletionException.class,
                () -> service.deleteAccount(42L, "secret"));

        assertEquals("staff_account_requires_support", ex.getCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    void blocksSelfDeletionForActivePartnerUsers() {
        User user = customer();
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "$2a$stored")).thenReturn(true);
        when(partnerUserRepository.findByUserIdAndActiveTrue(42L))
                .thenReturn(Optional.of(new com.broandbro.qrapp.entity.PartnerUser()));

        AccountDeletionException ex = assertThrows(AccountDeletionException.class,
                () -> service.deleteAccount(42L, "secret"));

        assertEquals("staff_account_requires_support", ex.getCode());
        assertTrue(user.getActive());
    }
}
