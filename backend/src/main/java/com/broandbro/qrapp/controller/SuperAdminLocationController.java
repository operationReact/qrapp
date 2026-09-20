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

    @GetMapping("/locations")
    public List<LocationResponse> locations(org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        return locationRepository.findAll().stream().map(LocationResponse::from).toList();
    }

    @PostMapping("/locations")
    public ResponseEntity<LocationResponse> create(@Valid @RequestBody LocationRequest request,
                                                    org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        if (locationRepository.findByCode(request.getCode()).isPresent()) return ResponseEntity.status(HttpStatus.CONFLICT).build();
        Location l = Location.builder().code(request.getCode().trim()).name(request.getName().trim())
                .address(request.getAddress()).active(request.getActive()).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(LocationResponse.from(locationRepository.save(l)));
    }

    @PutMapping("/locations/{id}")
    public LocationResponse update(@PathVariable Long id, @Valid @RequestBody LocationRequest request,
                                   org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        Location l = locationRepository.findById(id).orElseThrow();
        l.setCode(request.getCode().trim()); l.setName(request.getName().trim());
        l.setAddress(request.getAddress()); l.setActive(request.getActive());
        return LocationResponse.from(locationRepository.save(l));
    }

    @GetMapping("/users")
    public List<UserResponse> users(org.springframework.security.core.Authentication authentication) {
        authorize(authentication);
        return userRepository.findAll().stream().map(this::userResponse).toList();
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
}
