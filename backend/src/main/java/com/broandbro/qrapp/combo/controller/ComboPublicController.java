package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.ComboCardResponse;
import com.broandbro.qrapp.combo.service.ComboService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public (unauthenticated) combo listing endpoint.
 *
 * <pre>
 * GET /api/combos   → list of active combo cards for customer-facing UI
 * </pre>
 */
@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
@Tag(name = "Public – Combos", description = "Customer-facing combo listing")
public class ComboPublicController {

    private final ComboService comboService;

    @GetMapping
    @Operation(summary = "Get all active combos for the menu page")
    public ResponseEntity<List<ComboCardResponse>> getPublicCombos() {
        return ResponseEntity.ok(comboService.getPublicCombos());
    }
}

