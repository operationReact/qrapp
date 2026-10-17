package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','SUPERUSER')")
public class SuperAdminLocationController {
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final UserLocationAccessRepository accessRepository;
    private final UserService userService;
    private final LocationAccessService accessService;
    private final com.broandbro.qrapp.service.LocationCodeService locationCodeService;
    private final com.broandbro.qrapp.service.LocationPhotoService locationPhotoService;
    private final com.broandbro.qrapp.service.LocationDeletionService locationDeletionService;
    private final com.broandbro.qrapp.service.PartnerService partnerService;
    private final com.broandbro.qrapp.repository.PartnerLocationRepository partnerLocationRepository;

    @GetMapping("/locations")
    public Page<LocationResponse> locations(
            @RequestParam(defaultValue = "ACTIVE") String status,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long customerCompanyId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_location_pagination");
        }
        Boolean active = switch (status.trim().toUpperCase(java.util.Locale.ROOT)) {
            case "ACTIVE" -> true;
            case "INACTIVE" -> false;
            case "ALL" -> null;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_location_status");
        };
        return locationRepository.findForAdminFilters(active, cleanLower(state), cleanLower(city), cleanLower(country),
                        customerCompanyId, cleanLower(search), PageRequest.of(page, size, Sort.by("name").ascending()))
                .map(this::locationResponse);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String cleanLower(String value) {
        String cleaned = clean(value);
        return cleaned == null ? "" : cleaned.toLowerCase(java.util.Locale.ROOT);
    }

    @PostMapping("/locations")
    public ResponseEntity<LocationResponse> create(@Valid @RequestBody LocationRequest request,
                                                    org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        String name = request.getName().trim();
        Location l = Location.builder().name(name)
                .country(trimOrDefault(request.getCountry(), "India"))
                .addressLine1(request.getAddressLine1().trim())
                .addressLine2(trim(request.getAddressLine2()))
                .landmark(trim(request.getLandmark()))
                .city(request.getCity().trim())
                .district(request.getDistrict().trim())
                .stateUt(request.getStateUt().trim())
                .pinCode(request.getPinCode().trim())
                .active(request.getActive()).build();
        l.setLatitude(request.getLatitude());
        l.setLongitude(request.getLongitude());
        l.setAddress(formatAddress(l));
        Location saved = locationCodeService.create(l, request.getCode());
        syncPartner(saved, request.getPartnerId(), authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(locationResponse(saved));
    }

    @PostMapping(value = "/locations", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LocationResponse> createMultipart(
            @Valid @RequestPart("location") LocationRequest request,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestPart(value = "removePhoto", required = false) Boolean removePhoto,
            org.springframework.security.core.Authentication authentication) {
        ResponseEntity<LocationResponse> created = create(request, authentication);
        if (photo == null) return created;
        Location location = locationRepository.findById(created.getBody().getId()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(LocationResponse.from(locationPhotoService.replace(location, photo)));
    }

    @PatchMapping("/locations/{id}/active")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public LocationResponse setActive(
            @PathVariable Long id,
            @RequestParam boolean active,
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        Location location = locationRepository.findById(id).orElseThrow();
        location.setActive(active);
        return LocationResponse.from(locationRepository.save(location));
    }

    @PutMapping("/locations/{id}")
    public LocationResponse update(@PathVariable Long id, @Valid @RequestBody LocationRequest request,
                                   org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        Location l = locationRepository.findById(id).orElseThrow();
        l.setName(request.getName().trim());
        l.setCountry(trimOrDefault(request.getCountry(), "India"));
        l.setAddressLine1(request.getAddressLine1().trim());
        l.setAddressLine2(trim(request.getAddressLine2()));
        l.setLandmark(trim(request.getLandmark()));
        l.setCity(request.getCity().trim());
        l.setDistrict(request.getDistrict().trim());
        l.setStateUt(request.getStateUt().trim());
        l.setPinCode(request.getPinCode().trim());
        l.setLatitude(request.getLatitude());
        l.setLongitude(request.getLongitude());
        l.setAddress(formatAddress(l));
        l.setActive(request.getActive());
        Location saved = locationCodeService.update(l, request.getCode());
        syncPartner(saved, request.getPartnerId(), authentication);
        return locationResponse(saved);
    }

    @PutMapping(value = "/locations/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LocationResponse updateMultipart(
            @PathVariable Long id,
            @Valid @RequestPart("location") LocationRequest request,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestPart(value = "removePhoto", required = false) Boolean removePhoto,
            org.springframework.security.core.Authentication authentication) {
        LocationResponse updated = update(id, request, authentication);
        if (photo == null && !Boolean.TRUE.equals(removePhoto)) return updated;
        Location location = locationRepository.findById(id).orElseThrow();
        if (Boolean.TRUE.equals(removePhoto)) location = locationPhotoService.remove(location);
        if (photo == null) return LocationResponse.from(location);
        return LocationResponse.from(locationPhotoService.replace(location, photo));
    }

    @DeleteMapping("/locations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,
                       org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        locationDeletionService.deleteLocationWithCleanup(id);
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String trimOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String formatAddress(Location location) {
        return java.util.stream.Stream.of(
                        location.getAddressLine1(), location.getAddressLine2(), location.getLandmark(),
                        location.getCity(), location.getDistrict(), location.getStateUt(), location.getPinCode())
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private void syncPartner(Location location, Long partnerId,
                             org.springframework.security.core.Authentication authentication) {
        if (partnerId == null) {
            partnerService.clearLocationPartner(location.getId(), authentication.getName());
        } else {
            partnerService.syncLocationPartner(location.getId(), partnerId, authentication.getName());
        }
    }

    private LocationResponse locationResponse(Location location) {
        LocationResponse response = LocationResponse.from(location);
        partnerLocationRepository.findActivePrimaryByLocation(location.getId(),
                        com.broandbro.qrapp.entity.PartnerRelationshipStatus.ACTIVE,
                        com.broandbro.qrapp.entity.PartnerRelationshipType.PRIMARY)
                .ifPresent(link -> {
                    response.setPartnerId(link.getPartner().getId());
                    response.setPartnerName(link.getPartner().getDisplayName());
                    response.setPartnerRelationshipType(link.getRelationshipType().name());
                    response.setPartnerEffectiveFrom(link.getEffectiveFrom());
                    response.setPartnerEffectiveTo(link.getEffectiveTo());
                });
        response.setSecondaryPartnerCount(partnerLocationRepository.countByLocationIdAndStatusAndRelationshipType(
                location.getId(), com.broandbro.qrapp.entity.PartnerRelationshipStatus.ACTIVE,
                com.broandbro.qrapp.entity.PartnerRelationshipType.SECONDARY));
        return response;
    }

    @GetMapping("/users")
    public List<UserResponse> users(
            @RequestParam(required = false) Long locationId,
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        List<User> users = locationId == null
                ? userRepository.findAll()
                : userRepository.findAllByLocationId(locationId);
        return users.stream().map(this::userResponse).toList();
    }

    @GetMapping("/users/create-options")
    public CreateUserOptionsResponse createUserOptions(
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        return new CreateUserOptionsResponse(
                locationRepository.findByActiveTrueOrderByNameAsc().stream()
                        .map(LocationResponse::from).toList(),
                List.of(UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN_STAFF));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @Valid @RequestBody CreateUserRequest request,
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(userService.createInternalUser(request));
        } catch (IllegalArgumentException exception) {
            String reason = exception.getMessage();
            if ("phone_taken".equals(reason)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("phone_taken");
            }
            if ("location_not_found".equals(reason) || "role_not_assignable".equals(reason)
                    || "invalid_phone_number".equals(reason)) {
                return ResponseEntity.badRequest().body(reason);
            }
            return ResponseEntity.badRequest().body("invalid_user_request");
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("phone_taken");
        }
    }

    @PutMapping("/users/{userId}/role")
    public UserResponse role(@PathVariable Long userId, @Valid @RequestBody UserRoleRequest request,
                             org.springframework.security.core.Authentication authentication) {
        User actor = authorize(authentication);
        User user = userRepository.findById(userId).orElseThrow();
        accessService.requireNotSelf(actor, user);
        user.setRole(request.getRole());
        user.setIsAdmin(request.getRole() == UserRole.ADMIN || request.getRole() == UserRole.SUPER_ADMIN);
        user.setIsSuperUser(request.getRole() == UserRole.SUPER_ADMIN);
        if (request.getDefaultLocationId() != null)
            user.setDefaultLocation(locationRepository.findById(request.getDefaultLocationId()).orElseThrow());
        return userResponse(userRepository.save(user));
    }

    @PutMapping("/users/{userId}/password")
    public ResponseEntity<?> resetPassword(
            @PathVariable Long userId,
            @Valid @RequestBody AdminPasswordResetRequest request,
            org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        try {
            return ResponseEntity.ok(userService.resetPasswordByAdmin(userId, request.getNewPassword()));
        } catch (IllegalArgumentException exception) {
            if ("user_not_found".equals(exception.getMessage())) {
                return ResponseEntity.notFound().build();
            }
            if ("password_length_invalid".equals(exception.getMessage())) {
                return ResponseEntity.badRequest().body("password_length_invalid");
            }
            throw exception;
        }
    }

    @GetMapping("/users/{userId}/locations")
    public List<UserLocationAccessResponse> userLocations(@PathVariable Long userId,
                                                org.springframework.security.core.Authentication authentication) {
        User actor = authorize(authentication);
        User user = userRepository.findById(userId).orElseThrow();
                                                if (isSuperAdmin(user)) {
                                                    return locationRepository.findByActiveTrueOrderByNameAsc().stream()
                                                            .map(location -> new UserLocationAccessResponse(
                                                                    LocationResponse.from(location), UserRole.SUPER_ADMIN)).toList();
                                                }
                                                accessService.requireNotSelf(actor, user);
                                                return accessRepository.findByUserIdOrderByLocationNameAsc(userId).stream()
                .filter(a -> Boolean.TRUE.equals(a.getActive())
                        && a.getLocation() != null
                        && Boolean.TRUE.equals(a.getLocation().getActive()))
                .map(a -> new UserLocationAccessResponse(
                        LocationResponse.from(a.getLocation()), a.getRole())).toList();
    }

    @PutMapping("/users/{userId}/locations/{locationId}")
    public LocationResponse grant(@PathVariable Long userId, @PathVariable Long locationId,
                                  @Valid @RequestBody UserLocationAccessRequest request,
                                  org.springframework.security.core.Authentication authentication) {
        User actor = authorize(authentication);
        User user = userRepository.findById(userId).orElseThrow();
        accessService.requireNotSelf(actor, user);
        Location location = locationRepository.findById(locationId).orElseThrow();
        if (!Boolean.TRUE.equals(location.getActive())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT, "location_inactive");
        }
        UserRole assignmentRole = request.getRole() == UserRole.CUSTOMER && user.getRole() != UserRole.CUSTOMER
                ? user.getRole() : request.getRole();
        if (assignmentRole == UserRole.CUSTOMER || assignmentRole == UserRole.SUPER_ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "role_not_assignable");
        }
        UserLocationAccess access = accessRepository.findByUserIdAndLocationId(userId, locationId)
                .orElseGet(() -> UserLocationAccess.builder().user(user).location(location).build());
        access.setActive(request.getActive());
        access.setRole(assignmentRole);
        accessRepository.save(access);
        return LocationResponse.from(location);
    }

    @DeleteMapping("/users/{userId}/locations/{locationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long userId, @PathVariable Long locationId,
                       org.springframework.security.core.Authentication authentication) {
        User actor = authorize(authentication);
        User user = userRepository.findById(userId).orElseThrow();
        accessService.requireNotSelf(actor, user);
        accessRepository.findByUserIdAndLocationId(userId, locationId).ifPresent(a -> {
            a.setActive(false); accessRepository.save(a);
        });
    }

    private User authorize(org.springframework.security.core.Authentication authentication) {
        User actor = authentication == null ? null : userService.findByPhone(authentication.getName()).orElse(null);
        accessService.requireSuperAdmin(actor);
        return actor;
    }

    private boolean isSuperAdmin(User user) {
        return user != null
                && (user.getRole() == UserRole.SUPER_ADMIN || Boolean.TRUE.equals(user.getIsSuperUser()));
    }

    private UserResponse userResponse(User u) {
        UserResponse r = new UserResponse();
        r.setId(u.getId()); r.setPhone(u.getPhone()); r.setName(u.getName());
        r.setIsAdmin(u.getIsAdmin()); r.setIsSuperUser(u.getIsSuperUser());
        r.setRole(u.getRole() == null ? "CUSTOMER" : u.getRole().name());
        r.setDefaultLocation(u.getDefaultLocation() == null ? null : LocationResponse.from(u.getDefaultLocation()));
        return r;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> invalidRequest() {
        return ResponseEntity.badRequest().body("invalid_user_request");
    }
}
