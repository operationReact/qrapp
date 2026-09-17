package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.RegisterRequest;
import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.dto.UpdateProfileRequest;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.time.Instant;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    // simple token->user cache to reduce DB lookups from TokenAuthFilter
    private static class CachedUser { final User u; final Instant ts; CachedUser(User u){ this.u=u; this.ts=Instant.now(); }}
    private final ConcurrentMap<String, CachedUser> tokenCache = new ConcurrentHashMap<>();
    private static final Duration TOKEN_CACHE_TTL = Duration.ofSeconds(30);

    /**
     * Register a new user and create their wallet
     */
    @Transactional
    public UserResponse register(RegisterRequest req) {
        if (userRepository.findByPhone(req.getPhone()).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }
        User u = User.builder()
                .phone(req.getPhone())
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .build();
        u = userRepository.save(u);

        // Create wallet for new user
        Wallet wallet = Wallet.builder()
                .user(u)
                .balance(0L)  // Start with 0 balance
                .build();
        walletRepository.save(wallet);

        return toResponse(u);
    }

    // ...existing code...

    public LoginResponse login(String phone, String password) {
        Optional<User> o = userRepository.findByPhone(phone);
        if (o.isEmpty()) return null;
        User u = o.get();
        if (!passwordEncoder.matches(password, u.getPassword())) return null;
        // generate simple token
        byte[] b = new byte[24];
        random.nextBytes(b);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        u.setToken(token);
        userRepository.save(u);
        cacheUser(u);
        LoginResponse res = new LoginResponse();
        res.setToken(token);
        res.setUser(toResponse(u));
        return res;
    }

    @Transactional
    public LoginResponse registerVerified(String phone, String name, String passwordHash) {
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }
        User user = userRepository.save(User.builder()
                .phone(phone)
                .password(passwordHash)
                .name(name)
                .build());
        walletRepository.save(Wallet.builder().user(user).balance(0L).build());
        String token = generateToken(user);
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setUser(toResponse(user));
        return response;
    }

    private String generateToken(User user) {
        byte[] b = new byte[24];
        random.nextBytes(b);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        user.setToken(token);
        userRepository.save(user);
        cacheUser(user);
        return token;
    }

    public Optional<User> findByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }

    public Optional<User> findByToken(String token) {
        // consult local cache first
        if (token == null) return Optional.empty();
        CachedUser cu = tokenCache.get(token);
        if (cu != null) {
            if (Duration.between(cu.ts, Instant.now()).compareTo(TOKEN_CACHE_TTL) < 0) {
                return Optional.of(cu.u);
            } else {
                tokenCache.remove(token, cu);
            }
        }
        Optional<User> user = userRepository.findByToken(token);
        user.ifPresent(this::cacheUser);
        return user;
    }

    @Transactional
    public UserResponse updateProfile(String currentPhone, UpdateProfileRequest req) {
        User user = userRepository.findByPhone(currentPhone)
                .orElseThrow(() -> new IllegalArgumentException("user_not_found"));

        if (req.getName() != null) {
            String name = trimToNull(req.getName());
            if (!Objects.equals(user.getName(), name)) {
                user.setName(name);
            }
        }

        if (req.getPhone() != null) {
            String nextPhone = req.getPhone().trim();
            if (nextPhone.isEmpty()) {
                throw new IllegalArgumentException("phone_required");
            }
            if (!nextPhone.equals(user.getPhone())) {
                userRepository.findByPhone(nextPhone)
                        .filter(existing -> !existing.getId().equals(user.getId()))
                        .ifPresent(existing -> {
                            throw new IllegalArgumentException("phone_taken");
                        });
                user.setPhone(nextPhone);
            }
        }

        String newPassword = trimToNull(req.getNewPassword());
        if (newPassword != null) {
            String currentPassword = trimToNull(req.getCurrentPassword());
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new IllegalArgumentException("invalid_current_password");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        User saved = userRepository.save(user);
        cacheUser(saved);
        return toResponse(saved);
    }

    private void cacheUser(User user) {
        if (user != null && user.getToken() != null && !user.getToken().isBlank()) {
            tokenCache.put(user.getToken(), new CachedUser(user));
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private UserResponse toResponse(User u) {
        UserResponse r = new UserResponse();
        r.setId(u.getId());
        r.setPhone(u.getPhone());
        r.setName(u.getName());
        r.setIsAdmin(u.getIsAdmin());
        r.setIsSuperUser(u.getIsSuperUser());
        return r;
    }
}
