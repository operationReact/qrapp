package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.LocationResponse;
import com.broandbro.qrapp.dto.PublicLocationPageResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {
    private final UserService userService;
    private final LocationAccessService accessService;

    @GetMapping({"/accessible", "/authorized"})
    public ResponseEntity<List<LocationResponse>> accessible(org.springframework.security.core.Authentication authentication) {
        User user = current(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(accessService.getAccessibleLocations(user).stream()
                .map(LocationResponse::from).toList());
    }

    @GetMapping("/public")
    public List<LocationResponse> publicLocations() {
        return accessService.getPublicCustomerLocations().stream()
                .map(LocationResponse::from).toList();
    }

    @GetMapping("/public/search")
    public ResponseEntity<PublicLocationPageResponse> searchPublicLocations(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        if (page < 0 || size < 1 || size > 50) {
            return ResponseEntity.badRequest().build();
        }
        String query = search == null ? "" : search.trim().toLowerCase(java.util.Locale.ROOT);
        var result = accessService.searchPublicCustomerLocations(query, page, size);
        return ResponseEntity.ok(new PublicLocationPageResponse(
                result.map(LocationResponse::from).getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext()));
    }

    @GetMapping("/{locationId}/authorized")
    public ResponseEntity<Void> authorized(@PathVariable Long locationId,
                                           org.springframework.security.core.Authentication authentication) {
        User user = current(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        accessService.requireLocationAccess(user, locationId);
        return ResponseEntity.ok().build();
    }

    private User current(org.springframework.security.core.Authentication a) {
        return a == null ? null : userService.findByPhone(a.getName()).orElse(null);
    }
}
