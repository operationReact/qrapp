package com.broandbro.qrapp.config;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserLocationAccess;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.UserLocationAccessRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"dev", "test"})
@RequiredArgsConstructor
public class DevSuperAdminSeed implements CommandLineRunner {
    private static final String SUPER_ADMIN_PHONE = "709327979";

    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final UserLocationAccessRepository accessRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev.seed.super-admin-password:Iamgreat@2025}")
    private String superAdminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        Location meenakshiTowers = ensureLocation("MEENAKSHI_TOWERS", "Meenakshi Towers");
        Location mindspace = ensureLocation("MINDSPACE", "Mindspace");
        User superAdmin = ensureSuperAdmin(meenakshiTowers);

        ensureAccess(superAdmin, meenakshiTowers);
        ensureAccess(superAdmin, mindspace);
    }

    private Location ensureLocation(String code, String name) {
        Location location = locationRepository.findByCode(code)
                .orElseGet(() -> Location.builder().code(code).name(name).build());
        location.setName(name);
        location.setActive(true);
        return locationRepository.save(location);
    }

    private User ensureSuperAdmin(Location defaultLocation) {
        User user = userRepository.findByPhone(SUPER_ADMIN_PHONE)
                .orElseGet(() -> User.builder().phone(SUPER_ADMIN_PHONE).build());
        user.setName("Satya Varma");
        user.setRole(UserRole.SUPER_ADMIN);
        user.setIsAdmin(true);
        user.setIsSuperUser(true);
        user.setDefaultLocation(defaultLocation);
        if (user.getPassword() == null || user.getPassword().isBlank()
                || !passwordEncoder.matches(superAdminPassword, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(superAdminPassword));
        }
        User saved = userRepository.save(user);
        if (walletRepository.findByUser(saved).isEmpty()) {
            walletRepository.save(Wallet.builder().user(saved).balance(0L).build());
        }
        return saved;
    }

    private void ensureAccess(User user, Location location) {
        UserLocationAccess access = accessRepository.findByUserIdAndLocationId(user.getId(), location.getId())
                .orElseGet(() -> UserLocationAccess.builder().user(user).location(location).build());
        access.setActive(true);
        accessRepository.save(access);
    }
}
