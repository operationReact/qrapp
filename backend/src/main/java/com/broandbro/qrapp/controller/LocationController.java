package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.LocationResponse;
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
