package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.PartnerUser;
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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Self-service customer account deletion.
 *
 * The user row cannot be hard-deleted because orders, wallet transactions, invoices and
 * coupon/milestone records reference it and must be retained for financial and tax purposes.
 * Instead, every personal identifier on the account is erased and the account is disabled,
 * and the phone number is removed from the customer's order records.
 */
@Service
@RequiredArgsConstructor
public class AccountDeletionService {
    static final String DELETED_PHONE_PLACEHOLDER = "deleted";

    private static final Set<OrderStatus> OPEN_ORDER_STATUSES = EnumSet.of(
            OrderStatus.PRE_ORDERED,
            OrderStatus.ORDER_PLACED,
            OrderStatus.ACKNOWLEDGED,
            OrderStatus.PREPARING,
            OrderStatus.READY);

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final OrderRepository orderRepository;
    private final PartnerUserRepository partnerUserRepository;
    private final WhatsAppOtpRepository whatsAppOtpRepository;
    private final PasswordResetAuthorizationRepository passwordResetAuthorizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @Transactional
    public void deleteAccount(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AccountDeletionException("user_not_found", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new AccountDeletionException("invalid_password", HttpStatus.FORBIDDEN);
        }
        if (isStaffAccount(user)) {
            throw new AccountDeletionException("staff_account_requires_support", HttpStatus.FORBIDDEN);
        }

        List<Order> orders = orderRepository.findAllByUserIdOrderByCreatedAtDescIdDesc(user.getId());
        if (orders.stream().anyMatch(order -> OPEN_ORDER_STATUSES.contains(order.getStatus()))) {
            throw new AccountDeletionException("active_orders_exist", HttpStatus.CONFLICT);
        }
        Optional<Wallet> wallet = walletRepository.findByUserId(user.getId());
        if (wallet.isPresent() && wallet.get().getBalance() != null && wallet.get().getBalance().signum() > 0) {
            throw new AccountDeletionException("wallet_balance_remaining", HttpStatus.CONFLICT);
        }

        String originalPhone = user.getPhone();
        userService.invalidateToken(user);
        whatsAppOtpRepository.deleteByPhoneNumber(originalPhone);
        passwordResetAuthorizationRepository.deleteByPhoneNumber(originalPhone);
        orders.forEach(order -> order.setPhone(DELETED_PHONE_PLACEHOLDER));

        user.setPhone("deleted-user-" + user.getId());
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setName(null);
        user.setDateOfBirth(null);
        user.setSpecialDate(null);
        user.setSpecialDateDescription(null);
        user.setSpecialDayType(null);
        user.setSpecialDayCustomLabel(null);
        user.setCustomerCompany(null);
        user.setDefaultLocation(null);
        user.setToken(null);
        user.setMustChangePassword(false);
        user.setActive(false);
        userRepository.save(user);
    }

    private boolean isStaffAccount(User user) {
        if (Boolean.TRUE.equals(user.getIsAdmin()) || Boolean.TRUE.equals(user.getIsSuperUser())) {
            return true;
        }
        if (user.getRole() != null && user.getRole() != UserRole.CUSTOMER) {
            return true;
        }
        Optional<PartnerUser> partnerUser = partnerUserRepository.findByUserIdAndActiveTrue(user.getId());
        return partnerUser.isPresent();
    }
}
