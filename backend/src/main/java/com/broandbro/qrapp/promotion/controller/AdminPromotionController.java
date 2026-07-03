package com.broandbro.qrapp.promotion.controller;

import com.broandbro.qrapp.promotion.dto.CreatePromotionRequest;
import com.broandbro.qrapp.promotion.dto.PromotionResponse;
import com.broandbro.qrapp.promotion.service.AdminPromotionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin Promotion API — requires ROLE_ADMIN.
 *
 * GET    /api/admin/promotions          — list all
 * GET    /api/admin/promotions/{id}     — get single
 * POST   /api/admin/promotions          — create
 * PATCH  /api/admin/promotions/{id}/toggle — toggle active/inactive
 * DELETE /api/admin/promotions/{id}     — delete
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPromotionController {

    private final AdminPromotionService adminService;

    @GetMapping
    public ResponseEntity<List<PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(adminService.getAllPromotions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PromotionResponse> getPromotion(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(adminService.getPromotion(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createPromotion(
            @RequestBody CreatePromotionRequest request,
            Authentication authentication) {
        String actor = authentication != null ? authentication.getName() : "system";
        try {
            PromotionResponse response = adminService.createPromotion(request, actor);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePromotion(
            @PathVariable Long id,
            @RequestBody CreatePromotionRequest request,
            Authentication authentication) {
        String actor = authentication != null ? authentication.getName() : "system";
        try {
            PromotionResponse response = adminService.updatePromotion(id, request, actor);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<PromotionResponse> toggleStatus(
            @PathVariable Long id, Authentication authentication) {
        String actor = authentication != null ? authentication.getName() : "system";
        try {
            return ResponseEntity.ok(adminService.toggleStatus(id, actor));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromotion(@PathVariable Long id) {
        try {
            adminService.deletePromotion(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}

