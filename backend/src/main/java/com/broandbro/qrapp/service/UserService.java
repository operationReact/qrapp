package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.LegalProperties;
import com.broandbro.qrapp.dto.RegisterRequest;
import com.broandbro.qrapp.dto.CreateUserRequest;
import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.dto.UpdateProfileRequest;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.UserLocationAccessRepository;
import com.broandbro.qrapp.entity.UserLocationAccess;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.otp.PhoneNumberNormalizer;
import com.broandbro.qrapp.exception.OtpException;
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
    private final LocationRepository locationRepository;
    private final UserLocationAccessRepository userLocationAccessRepository;
    private final CustomerCompanyService customerCompanyService;
    private final LocationAccessService locationAccessService;
    private final LegalProperties legalProperties;
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
        requireTermsAccepted(req.getTermsAccepted());
        if (userRepository.findByPhone(req.getPhone()).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }

        if (req.getCustomerCompanyId() == null) {
            throw new IllegalArgumentException("customer_company_required");
        }
        String specialDayType = SpecialDayTypes.typeOrNull(req.getSpecialDayType());
        if (specialDayType != null && req.getSpecialDate() == null) {
            throw new IllegalArgumentException("special_date_required");
        }
        User u = User.builder()
                .phone(req.getPhone())
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .dateOfBirth(req.getDateOfBirth())
                .specialDate(req.getSpecialDate())
                .specialDayType(specialDayType)
                .specialDayCustomLabel(SpecialDayTypes.customLabelOrNull(
                        specialDayType, req.getSpecialDayCustomLabel()))
                .termsAccepted(true)
                .termsAcceptedAt(Instant.now())
                .termsVersion(legalProperties.getTermsVersion())
                .privacyPolicyVersion(legalProperties.getPrivacyPolicyVersion())
                .build();
        u.setDefaultLocation(resolveDefaultLocation(req.getDefaultLocationId()));
        u.setCustomerCompany(customerCompanyService.validateRegistration(
                       u.getDefaultLocation().getId(), req.getCustomerCompanyId()));
        u = userRepository.save(u);
        if (u.getDefaultLocation() != null) {
            userLocationAccessRepository.save(UserLocationAccess.builder()
                    .user(u).location(u.getDefaultLocation()).active(true).build());
        }

        // Create wallet for new user
        Wallet wallet = Wallet.builder()
                .user(u)
                .balance(0L)  // Start with 0 balance
                .build();
        walletRepository.save(wallet);

        return toResponse(u);
    }

    @Transactional
    public UserResponse createInternalUser(CreateUserRequest req) {
        UserRole role = req.getRole();
        if (role == null || role == UserRole.CUSTOMER || role == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("role_not_assignable");
        }
        String phone;
        try {
            phone = PhoneNumberNormalizer.normalize(req.getPhone());
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("invalid_phone_number", exception);
        }
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }
        Location location = locationRepository.findById(req.getLocationId())
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found"));
        User user = User.builder()
                .phone(phone).password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName().trim()).role(role)
                .isAdmin(role == UserRole.ADMIN).isSuperUser(false)
                .termsAccepted(false).defaultLocation(location).build();
        user = userRepository.save(user);
        userLocationAccessRepository.save(UserLocationAccess.builder()
                .user(user).location(location).active(true).build());
        walletRepository.save(Wallet.builder().user(user).balance(0L).build());
        return toResponse(user);
    }

    // ...existing code...

    public LoginResponse login(String phone, String password) {
        Optional<User> o = userRepository.findByPhone(phone);
        if (o.isEmpty()) {
            try {
                String normalizedPhone = PhoneNumberNormalizer.normalize(phone);
                if (!normalizedPhone.equals(phone)) {
                    o = userRepository.findByPhone(normalizedPhone);
                }
            } catch (OtpException ignored) {
                // Preserve the existing invalid-credentials response for malformed login identifiers.
            }
        }
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
        return registerVerified(phone, name, passwordHash, null, null, null, null, null);
    }

    @Transactional
    public LoginResponse registerVerified(String phone, String name, String passwordHash, Long defaultLocationId) {
        return registerVerified(phone, name, passwordHash, defaultLocationId, null, null, null, null);
    }

    @Transactional
    public LoginResponse registerVerified(String phone, String name, String passwordHash,
                                          Long defaultLocationId, Long customerCompanyId,
                                          java.time.LocalDate dateOfBirth,
                                          java.time.LocalDate specialDate,
                                          String specialDateDescription) {
        return registerVerified(phone, name, passwordHash, defaultLocationId, customerCompanyId,
                dateOfBirth, specialDate, specialDateDescription == null ? null : "Other",
                specialDateDescription, true, Instant.now(),
                legalProperties.getTermsVersion(), legalProperties.getPrivacyPolicyVersion());
    }

    @Transactional
    public LoginResponse registerVerified(String phone, String name, String passwordHash,
                                          Long defaultLocationId, Long customerCompanyId,
                                          java.time.LocalDate dateOfBirth,
                                          java.time.LocalDate specialDate,
                                          String specialDayType,
                                          String specialDayCustomLabel,
                                          Boolean termsAccepted, Instant termsAcceptedAt,
                                          String termsVersion, String privacyPolicyVersion) {
        requireTermsAccepted(termsAccepted);
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("phone_taken");
        }
        User user = User.builder()
                .phone(phone).password(passwordHash).name(name)
                .dateOfBirth(dateOfBirth).specialDate(specialDate)
                .specialDayType(SpecialDayTypes.typeOrNull(specialDayType))
                .specialDayCustomLabel(SpecialDayTypes.customLabelOrNull(
                        specialDayType, specialDayCustomLabel))
                .termsAccepted(true)
                .termsAcceptedAt(termsAcceptedAt == null ? Instant.now() : termsAcceptedAt)
                .termsVersion(termsVersion == null ? legalProperties.getTermsVersion() : termsVersion)
                .privacyPolicyVersion(privacyPolicyVersion == null
                        ? legalProperties.getPrivacyPolicyVersion() : privacyPolicyVersion)
                .build();
        user.setDefaultLocation(resolveDefaultLocation(defaultLocationId));
        if (customerCompanyId != null) {
            user.setCustomerCompany(customerCompanyService.validateRegistration(
                    user.getDefaultLocation().getId(), customerCompanyId));
        }
        user = userRepository.save(user);
        if (user.getDefaultLocation() != null) {
            userLocationAccessRepository.save(UserLocationAccess.builder()
                    .user(user).location(user.getDefaultLocation()).active(true).build());
        }
        walletRepository.save(Wallet.builder().user(user).balance(0L).build());
        byte[] tokenBytes = new byte[24];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        user.setToken(token);
        userRepository.save(user);
        cacheUser(user);
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setUser(toResponse(user));
        return response;
    }

    @Transactional
    public LoginResponse registerVerified(String phone, String name, String passwordHash,
                                          Long defaultLocationId, Long customerCompanyId,
                                          java.time.LocalDate dateOfBirth,
                                          java.time.LocalDate specialDate,
                                          String specialDateDescription,
                                          Boolean termsAccepted, Instant termsAcceptedAt,
                                          String termsVersion, String privacyPolicyVersion) {
        return registerVerified(phone, name, passwordHash, defaultLocationId, customerCompanyId,
                dateOfBirth, specialDate, "Other", specialDateDescription, termsAccepted,
                termsAcceptedAt, termsVersion, privacyPolicyVersion);
    }

    private void requireTermsAccepted(Boolean termsAccepted) {
        if (!Boolean.TRUE.equals(termsAccepted)) {
            throw new IllegalArgumentException("terms_acceptance_required");
        }
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

    private com.broandbro.qrapp.entity.Location resolveDefaultLocation(Long requestedLocationId) {
        if (requestedLocationId != null) {
            return locationRepository.findById(requestedLocationId)
                    .filter(location -> Boolean.TRUE.equals(location.getActive()))
                    .orElseThrow(() -> new IllegalArgumentException("location_not_found"));
        }
        return locationRepository.findByCode("PRAGATI_NAGAR")
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new IllegalStateException("default_location_not_configured"));
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

        if (req.getDateOfBirth() != null) {
            if (req.getDateOfBirth().isAfter(java.time.LocalDate.now())) {
                throw new IllegalArgumentException("date_of_birth_in_future");
            }
            user.setDateOfBirth(req.getDateOfBirth());
        }

        if (req.hasSpecialDateChange()) {
            String type = SpecialDayTypes.typeOrNull(req.getSpecialDayType());
            String customLabel = SpecialDayTypes.customLabelOrNull(type, req.getSpecialDayCustomLabel());
            if (req.getSpecialDate() == null && type != null) {
                throw new IllegalArgumentException("special_date_required");
            }
            user.setSpecialDate(req.getSpecialDate());
            user.setSpecialDayType(type);
            user.setSpecialDayCustomLabel(customLabel);
        }

        if (req.getDefaultLocationId() != null || req.getCustomerCompanyId() != null) {
            com.broandbro.qrapp.entity.Location location = user.getDefaultLocation();
            if (req.getDefaultLocationId() != null) {
                if (effectiveRole(user) != UserRole.CUSTOMER) {
                    locationAccessService.requireLocationAccess(user, req.getDefaultLocationId());
                }
                location = resolveDefaultLocation(req.getDefaultLocationId());
                user.setDefaultLocation(location);
                if (userLocationAccessRepository.findByUserIdAndLocationId(user.getId(), location.getId()).isEmpty()) {
                    userLocationAccessRepository.save(UserLocationAccess.builder()
                            .user(user).location(location).active(true).build());
                }
            }
            if (req.getCustomerCompanyId() != null) {
                if (location == null) {
                    throw new IllegalArgumentException("location_required");
                }
                user.setCustomerCompany(customerCompanyService.validateRegistration(
                        location.getId(), req.getCustomerCompanyId()));
            } else if (req.getDefaultLocationId() != null && user.getCustomerCompany() != null) {
                user.setCustomerCompany(customerCompanyService.validateRegistration(
                        location.getId(), user.getCustomerCompany().getId()));
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
        r.setDateOfBirth(u.getDateOfBirth());
        r.setSpecialDate(u.getSpecialDate());
        r.setSpecialDayType(u.getSpecialDayType());
        r.setSpecialDayCustomLabel(u.getSpecialDayCustomLabel());
        r.setIsAdmin(u.getIsAdmin());
        r.setIsSuperUser(u.getIsSuperUser());
        r.setRole(effectiveRole(u).name());
        r.setDefaultLocation(u.getDefaultLocation() == null ? null :
                com.broandbro.qrapp.dto.LocationResponse.from(u.getDefaultLocation()));
        r.setCustomerCompany(u.getCustomerCompany() == null ? null :
                com.broandbro.qrapp.dto.CustomerCompanyResponse.from(u.getCustomerCompany()));
        return r;
    }

    private UserRole effectiveRole(User u) {
        if (u.getRole() != null) return u.getRole();
        if (Boolean.TRUE.equals(u.getIsSuperUser())) return UserRole.SUPER_ADMIN;
        if (Boolean.TRUE.equals(u.getIsAdmin())) return UserRole.ADMIN;
        return UserRole.CUSTOMER;
    }
}
