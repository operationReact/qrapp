package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.RegisterRequest;
import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class UserAuthController {
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try {
            var user = userService.register(req);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody RegisterRequest req) {
        var res = userService.login(req.getPhone(), req.getPassword());
        if (res == null) return ResponseEntity.status(401).body("invalid_credentials");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String auth) {
        // expecting Bearer <token>
        if (auth == null || !auth.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = auth.substring(7);
        var u = userService.findByToken(token);
        return u.map(user -> {
            UserResponse r = new UserResponse();
            r.setId(user.getId());
            r.setPhone(user.getPhone());
            r.setName(user.getName());
            return ResponseEntity.ok(r);
        }).orElseGet(() -> ResponseEntity.status(401).build());
    }
}
