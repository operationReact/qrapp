package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.ComboCardResponse;
import com.broandbro.qrapp.combo.service.ComboService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public (unauthenticated) combo listing endpoint.
 *
 * <pre>
 * GET /api/combos?locationId={id}   → list of active combo cards for customer-facing UI,
 *                                      scoped to the given location (combos from other
 *                                      locations are never returned).
 * </pre>
 */
@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
@Tag(name = "Public – Combos", description = "Customer-facing combo listing")
public class ComboPublicController {

    private final ComboService comboService;

    @GetMapping
    @Operation(summary = "Get all active combos for the menu page, scoped to a location")
    public ResponseEntity<List<ComboCardResponse>> getPublicCombos(
            @RequestParam(required = false) Long locationId) {
        return ResponseEntity.ok(comboService.getPublicCombos(locationId));
    }
}

