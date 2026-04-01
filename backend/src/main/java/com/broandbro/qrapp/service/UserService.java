package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.RegisterRequest;
import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.time.Instant;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    // simple token->user cache to reduce DB lookups from TokenAuthFilter
    private static class CachedUser { final User u; final Instant ts; CachedUser(User u){ this.u=u; this.ts=Instant.now(); }}
    private final ConcurrentMap<String, CachedUser> tokenCache = new ConcurrentHashMap<>();
    private static final Duration TOKEN_CACHE_TTL = Duration.ofSeconds(30);

    public UserResponse register(RegisterRequest req) {
        if (userRepository.findByPhone(req.getPhone()).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }
        User u = User.builder()
                .phone(req.getPhone())
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .build();
        userRepository.save(u);
        return toResponse(u);
    }

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
        // populate token cache
        tokenCache.put(token, new CachedUser(u));
        LoginResponse res = new LoginResponse();
        res.setToken(token);
        res.setUser(toResponse(u));
        return res;
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
        return userRepository.findByToken(token);
    }

    private UserResponse toResponse(User u) {
        UserResponse r = new UserResponse();
        r.setId(u.getId());
        r.setPhone(u.getPhone());
        r.setName(u.getName());
        return r;
    }
}

