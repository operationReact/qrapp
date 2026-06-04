package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MilestoneConfig;
import com.broandbro.qrapp.service.MilestoneCouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin Milestone Configuration API — requires ROLE_ADMIN.
 *
 * GET    /api/admin/milestones          — list all
 * POST   /api/admin/milestones          — create
 * PUT    /api/admin/milestones/{id}     — update
 * PATCH  /api/admin/milestones/{id}/toggle — toggle active
 * DELETE /api/admin/milestones/{id}     — delete
 */
@RestController
@RequestMapping("/api/admin/milestones")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMilestoneController {

    private final MilestoneCouponService milestoneService;

    @GetMapping
    public ResponseEntity<List<MilestoneConfig>> getAll() {
        return ResponseEntity.ok(milestoneService.getAllConfigs());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody MilestoneConfig req) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(milestoneService.createConfig(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody MilestoneConfig req) {
        try {
            return ResponseEntity.ok(milestoneService.updateConfig(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(milestoneService.toggleConfig(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            milestoneService.deleteConfig(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}

