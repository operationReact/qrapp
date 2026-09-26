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
import java.util.List;

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

    @GetMapping("/locations")
    public List<LocationResponse> locations(org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        return locationRepository.findAll().stream().map(LocationResponse::from).toList();
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
        l.setAddress(formatAddress(l));
        return ResponseEntity.status(HttpStatus.CREATED).body(LocationResponse.from(locationCodeService.create(l, request.getCode())));
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
        l.setAddress(formatAddress(l));
        l.setActive(request.getActive());
        return LocationResponse.from(locationRepository.save(locationCodeService.update(l, request.getCode())));
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

    @GetMapping("/users")
    public List<UserResponse> users(org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        return userRepository.findAll().stream().map(this::userResponse).toList();
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

    @GetMapping("/users/{userId}/locations")
    public List<LocationResponse> userLocations(@PathVariable Long userId,
                                                org.springframework.security.core.Authentication authentication) {
        User actor = authorize(authentication);
        User user = userRepository.findById(userId).orElseThrow();
        accessService.requireNotSelf(actor, user);
        return accessRepository.findByUserIdOrderByLocationNameAsc(userId).stream()
                .filter(a -> Boolean.TRUE.equals(a.getActive())
                        && a.getLocation() != null
                        && Boolean.TRUE.equals(a.getLocation().getActive()))
                .map(a -> LocationResponse.from(a.getLocation())).toList();
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
        UserLocationAccess access = accessRepository.findByUserIdAndLocationId(userId, locationId)
                .orElseGet(() -> UserLocationAccess.builder().user(user).location(location).build());
        access.setActive(request.getActive());
        return LocationResponse.from(accessRepository.save(access).getLocation());
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
