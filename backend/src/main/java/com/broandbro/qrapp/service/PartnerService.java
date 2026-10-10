package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.security.SecureRandom;
import java.util.List;
import com.broandbro.qrapp.otp.PhoneNumberNormalizer;

@Service
@RequiredArgsConstructor
@Transactional
public class PartnerService {
    private final PartnerRepository partnerRepository;
    private final PartnerLocationRepository partnerLocationRepository;
    private final PartnerUserRepository partnerUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<PartnerSummaryResponse> list() {
        return partnerRepository.findAllByOrderByDisplayNameAsc().stream()
                .map(p -> PartnerSummaryResponse.from(p,
                        partnerLocationRepository.countByPartnerIdAndStatus(p.getId(), PartnerRelationshipStatus.ACTIVE)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PartnerResponse get(Long id) {
        return PartnerResponse.from(findPartner(id));
    }

    public PartnerResponse create(CreatePartnerRequest request, String actor) {
        String code = clean(request.getPartnerCode()).toUpperCase();
        if (partnerRepository.existsByPartnerCodeIgnoreCase(code)) {
            throw new DataIntegrityViolationException("partner_code_taken");
        }
        Partner partner = new Partner();
        copy(partner, request);
        partner.setPartnerCode(code);
        partner.setCreatedBy(actor);
        partner.setUpdatedBy(actor);
        return PartnerResponse.from(partnerRepository.save(partner));
    }

    public PartnerResponse update(Long id, UpdatePartnerRequest request, String actor) {
        Partner partner = findPartner(id);
        String code = clean(request.getPartnerCode()).toUpperCase();
        if (partnerRepository.existsByPartnerCodeIgnoreCaseAndIdNot(code, id)) {
            throw new DataIntegrityViolationException("partner_code_taken");
        }
        String existingAccountNumber = partner.getAccountNumber();
        copy(partner, request);
        if (clean(request.getAccountNumber()) == null) {
            partner.setAccountNumber(existingAccountNumber);
        }
        partner.setPartnerCode(code);
        partner.setUpdatedBy(actor);
        return PartnerResponse.from(partnerRepository.save(partner));
    }

    public PartnerResponse setStatus(Long id, PartnerStatus status, String actor) {
        Partner partner = findPartner(id);
        if (status == null) throw new IllegalArgumentException("invalid_partner_status");
        partner.setStatus(status);
        partner.setUpdatedBy(actor);
        if (status == PartnerStatus.INACTIVE) {
            partnerLocationRepository.findByPartnerIdOrderByStatusDescEffectiveFromDesc(id).stream()
                    .filter(link -> link.getStatus() == PartnerRelationshipStatus.ACTIVE)
                    .forEach(link -> {
                        link.setStatus(PartnerRelationshipStatus.INACTIVE);
                        link.setUpdatedBy(actor);
                    });
        }
        return PartnerResponse.from(partnerRepository.save(partner));
    }

    @Transactional(readOnly = true)
    public List<PartnerLocationResponse> locations(Long partnerId) {
        findPartner(partnerId);
        return partnerLocationRepository.findByPartnerIdOrderByStatusDescEffectiveFromDesc(partnerId)
                .stream().map(PartnerLocationResponse::from).toList();
    }

    public PartnerLocationResponse assignLocation(Long partnerId, PartnerLocationRequest request, String actor) {
        Partner partner = findPartner(partnerId);
        if (partner.getStatus() != PartnerStatus.ACTIVE) throw new ConflictException("partner_inactive");
        Location location = locationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new EntityNotFoundException("location_not_found"));
        if (!Boolean.TRUE.equals(location.getActive())) throw new ConflictException("location_inactive");
        if (request.getEffectiveTo() != null && request.getEffectiveFrom() != null
                && request.getEffectiveTo().isBefore(request.getEffectiveFrom())) {
            throw new IllegalArgumentException("invalid_effective_dates");
        }
        PartnerRelationshipType type = request.getRelationshipType() == null
                ? PartnerRelationshipType.PRIMARY : request.getRelationshipType();
        PartnerRelationshipStatus status = request.getStatus() == null
                ? PartnerRelationshipStatus.ACTIVE : request.getStatus();
        if (status == PartnerRelationshipStatus.ACTIVE
                && partnerLocationRepository.existsByPartnerIdAndLocationIdAndStatus(
                partnerId, location.getId(), PartnerRelationshipStatus.ACTIVE)) {
            throw new ConflictException("partner_location_exists");
        }
        if (status == PartnerRelationshipStatus.ACTIVE && type == PartnerRelationshipType.PRIMARY) {
            partnerLocationRepository.findActivePrimaryByLocation(location.getId(),
                            PartnerRelationshipStatus.ACTIVE, PartnerRelationshipType.PRIMARY)
                    .ifPresent(existing -> {
                        throw new ConflictException("location_primary_partner_exists");
                    });
        }
        PartnerLocation link = PartnerLocation.builder().partner(partner).location(location)
                .relationshipType(type).status(status)
                .effectiveFrom(request.getEffectiveFrom() == null ? LocalDate.now() : request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo()).createdBy(actor).updatedBy(actor).build();
        return PartnerLocationResponse.from(partnerLocationRepository.save(link));
    }

    public PartnerLocationResponse updateLocation(Long partnerId, Long assignmentId,
                                                  PartnerLocationUpdateRequest request, String actor) {
        findPartner(partnerId);
        PartnerLocation link = partnerLocationRepository.findByIdAndPartnerId(assignmentId, partnerId)
                .orElseThrow(() -> new EntityNotFoundException("partner_location_not_found"));
        PartnerRelationshipType type = request.getRelationshipType() == null
                ? link.getRelationshipType() : request.getRelationshipType();
        PartnerRelationshipStatus status = request.getStatus() == null
                ? link.getStatus() : request.getStatus();
        LocalDate from = request.getEffectiveFrom() == null ? link.getEffectiveFrom() : request.getEffectiveFrom();
        LocalDate to = request.getEffectiveTo() == null ? link.getEffectiveTo() : request.getEffectiveTo();
        if (to != null && from != null && to.isBefore(from)) {
            throw new IllegalArgumentException("invalid_effective_dates");
        }
        if (status == PartnerRelationshipStatus.ACTIVE) {
            Partner partner = findPartner(partnerId);
            if (partner.getStatus() != PartnerStatus.ACTIVE) throw new ConflictException("partner_inactive");
            if (type == PartnerRelationshipType.PRIMARY) {
                partnerLocationRepository.findActivePrimaryByLocation(link.getLocation().getId(),
                                PartnerRelationshipStatus.ACTIVE, PartnerRelationshipType.PRIMARY)
                        .filter(existing -> !existing.getId().equals(assignmentId))
                        .ifPresent(existing -> { throw new ConflictException("location_primary_partner_exists"); });
            }
            if (partnerLocationRepository.existsByPartnerIdAndLocationIdAndStatus(
                    partnerId, link.getLocation().getId(), PartnerRelationshipStatus.ACTIVE)
                    && link.getStatus() != PartnerRelationshipStatus.ACTIVE) {
                throw new ConflictException("partner_location_exists");
            }
        }
        link.setRelationshipType(type);
        link.setStatus(status);
        link.setEffectiveFrom(from);
        link.setEffectiveTo(to == null && status == PartnerRelationshipStatus.INACTIVE ? LocalDate.now() : to);
        link.setUpdatedBy(actor);
        return PartnerLocationResponse.from(partnerLocationRepository.save(link));
    }

    public void removeLocation(Long partnerId, Long assignmentId, String actor) {
        findPartner(partnerId);
        PartnerLocation link = partnerLocationRepository.findByIdAndPartnerId(assignmentId, partnerId)
                .orElseThrow(() -> new EntityNotFoundException("partner_location_not_found"));
        if (link.getStatus() != PartnerRelationshipStatus.ACTIVE) {
            throw new ConflictException("partner_location_inactive");
        }
        link.setStatus(PartnerRelationshipStatus.INACTIVE);
        link.setEffectiveTo(LocalDate.now());
        link.setUpdatedBy(actor);
        partnerLocationRepository.save(link);
    }

    public void syncLocationPartner(Long locationId, Long partnerId, String actor) {
        var existing = partnerLocationRepository.findActivePrimaryByLocation(locationId,
                PartnerRelationshipStatus.ACTIVE, PartnerRelationshipType.PRIMARY);
        if (existing.isPresent() && partnerId != null
                && existing.get().getPartner().getId().equals(partnerId)) return;
        existing.ifPresent(link -> {
            link.setStatus(PartnerRelationshipStatus.INACTIVE);
            link.setEffectiveTo(LocalDate.now());
            link.setUpdatedBy(actor);
            partnerLocationRepository.save(link);
        });
        if (partnerId == null) return;
        PartnerLocationRequest request = new PartnerLocationRequest();
        request.setLocationId(locationId);
        request.setRelationshipType(PartnerRelationshipType.PRIMARY);
        assignLocation(partnerId, request, actor);
    }

    public void clearLocationPartner(Long locationId, String actor) {
        syncLocationPartner(locationId, null, actor);
    }

    @Transactional(readOnly = true)
    public List<PartnerUserResponse> users(Long partnerId) {
        findPartner(partnerId);
        return partnerUserRepository.findByPartnerIdOrderByUser_NameAsc(partnerId).stream()
                .map(PartnerUserResponse::from).toList();
    }

    public PartnerUserResponse addUser(Long partnerId, PartnerUserRequest request, String actor) {
        Partner partner = findPartner(partnerId);
        if (partner.getStatus() != PartnerStatus.ACTIVE) throw new ConflictException("partner_inactive");
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("user_not_found"));
        if (!Boolean.TRUE.equals(user.getActive())) throw new ConflictException("user_inactive");
        PartnerUser link = partnerUserRepository.findByPartnerIdAndUserId(partnerId, user.getId())
                .orElseGet(() -> PartnerUser.builder().partner(partner).user(user).createdBy(actor).build());
        if (Boolean.TRUE.equals(link.getActive())) throw new ConflictException("partner_user_exists");
        if (user.getRole() != UserRole.PARTNER_ADMIN && user.getRole() != UserRole.PARTNER_USER) {
            user.setRole(UserRole.PARTNER_ADMIN);
            user.setIsAdmin(false);
            user.setIsSuperUser(false);
            userService.invalidateToken(user);
            user.setToken(null);
            userRepository.save(user);
        }
        link.setActive(true);
        link.setUpdatedBy(actor);
        return PartnerUserResponse.from(partnerUserRepository.save(link));
    }

    public PartnerInvitationResponse createUser(Long partnerId, CreatePartnerUserRequest request) {
        Partner partner = findPartner(partnerId);
        if (partner.getStatus() != PartnerStatus.ACTIVE) throw new ConflictException("partner_inactive");
        if (request.getRole() != UserRole.PARTNER_ADMIN && request.getRole() != UserRole.PARTNER_USER) {
            throw new IllegalArgumentException("partner_role_required");
        }
        String phone = PhoneNumberNormalizer.normalize(request.getPhone());
        if (userRepository.findByPhone(phone).isPresent()) throw new ConflictException("phone_taken");
        Location location = partnerLocationRepository
                .findByPartnerIdAndStatusOrderByStatusDescEffectiveFromDesc(partnerId, PartnerRelationshipStatus.ACTIVE)
                .stream().findFirst().map(PartnerLocation::getLocation)
                .orElseThrow(() -> new ConflictException("partner_location_required"));
        String temporaryPassword = generateTemporaryPassword();
        User user = User.builder().phone(phone).name(request.getName().trim())
                .password(passwordEncoder.encode(temporaryPassword)).role(request.getRole())
                .isAdmin(false).isSuperUser(false).active(true).mustChangePassword(true)
                .defaultLocation(location).termsAccepted(false).build();
        user = userRepository.save(user);
        partnerUserRepository.save(PartnerUser.builder().partner(partner).user(user).active(true).build());
        return new PartnerInvitationResponse(phone, temporaryPassword,
                "Share these credentials securely. The user must change the password after first login.");
    }

    @Transactional
    public PartnerInvitationResponse inviteUser(Long partnerId, Long userId) {
        Partner partner = findPartner(partnerId);
        if (partner.getStatus() != PartnerStatus.ACTIVE) {
            throw new ConflictException("partner_inactive");
        }
        PartnerUser link = partnerUserRepository.findByPartnerIdAndUserId(partnerId, userId)
                .orElseThrow(() -> new EntityNotFoundException("partner_user_not_found"));
        if (!Boolean.TRUE.equals(link.getActive()) || !Boolean.TRUE.equals(link.getUser().getActive())) {
            throw new ConflictException("partner_user_inactive");
        }
        User user = link.getUser();
        if (user.getRole() != UserRole.PARTNER_ADMIN && user.getRole() != UserRole.PARTNER_USER) {
            user.setRole(UserRole.PARTNER_ADMIN);
            user.setIsAdmin(false);
            user.setIsSuperUser(false);
        }
        String temporaryPassword = generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        userService.invalidateToken(user);
        user.setToken(null);
        userRepository.save(user);
        return new PartnerInvitationResponse(user.getPhone(), temporaryPassword,
                "Sign in once with this temporary password and change it immediately.");
    }

    private String generateTemporaryPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder("P@");
        while (password.length() < 12) {
            password.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }
        return password.toString();
    }

    public PartnerUserResponse updateUser(Long partnerId, Long userId,
                                          PartnerUserUpdateRequest request, String actor) {
        Partner partner = findPartner(partnerId);
        PartnerUser link = partnerUserRepository.findByPartnerIdAndUserId(partnerId, userId)
                .orElseThrow(() -> new EntityNotFoundException("partner_user_not_found"));
        if (Boolean.TRUE.equals(request.getActive())) {
            if (partner.getStatus() != PartnerStatus.ACTIVE) throw new ConflictException("partner_inactive");
            if (!Boolean.TRUE.equals(link.getUser().getActive())) throw new ConflictException("user_inactive");
        }
        link.setActive(request.getActive());
        link.setUpdatedBy(actor);
        return PartnerUserResponse.from(partnerUserRepository.save(link));
    }

    public void removeUser(Long partnerId, Long userId, String actor) {
        PartnerUser link = partnerUserRepository.findByPartnerIdAndUserId(partnerId, userId)
                .orElseThrow(() -> new EntityNotFoundException("partner_user_not_found"));
        link.setActive(false);
        link.setUpdatedBy(actor);
        partnerUserRepository.save(link);
    }

    private Partner findPartner(Long id) {
        return partnerRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("partner_not_found"));
    }

    private static void copy(Partner p, CreatePartnerRequest r) {
        p.setLegalName(clean(r.getLegalName())); p.setDisplayName(clean(r.getDisplayName()));
        p.setPrimaryContactName(clean(r.getPrimaryContactName())); p.setPrimaryContactEmail(clean(r.getPrimaryContactEmail()));
        p.setPrimaryContactPhone(clean(r.getPrimaryContactPhone())); p.setAlternateContactPhone(clean(r.getAlternateContactPhone()));
        p.setBusinessType(clean(r.getBusinessType())); p.setRegisteredAddress(clean(r.getRegisteredAddress()));
        p.setCity(clean(r.getCity())); p.setState(clean(r.getState())); p.setPincode(clean(r.getPincode()));
        p.setCountry(clean(r.getCountry()) == null ? "India" : clean(r.getCountry())); p.setGstRegistered(Boolean.TRUE.equals(r.getGstRegistered()));
        p.setGstin(clean(r.getGstin())); p.setPan(clean(r.getPan())); p.setTan(clean(r.getTan())); p.setFssai(clean(r.getFssai()));
        p.setOtherRegistrationDetails(clean(r.getOtherRegistrationDetails())); p.setAccountHolderName(clean(r.getAccountHolderName()));
        p.setBankName(clean(r.getBankName())); p.setAccountNumber(clean(r.getAccountNumber())); p.setIfsc(clean(r.getIfsc()));
        p.setUpiId(clean(r.getUpiId())); p.setLogoUrl(clean(r.getLogoUrl()));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static class ConflictException extends RuntimeException {
        public ConflictException(String message) { super(message); }
    }

}
