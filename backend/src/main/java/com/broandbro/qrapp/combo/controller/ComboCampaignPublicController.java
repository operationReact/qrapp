package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.campaign.ComboCampaignResponse;
import com.broandbro.qrapp.combo.dto.campaign.ComboCartEvaluationResponse;
import com.broandbro.qrapp.combo.service.ComboCampaignService;
import com.broandbro.qrapp.promotion.engine.CartContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public REST controller for Build-Your-Own-Combo (BYOC) campaigns.
 *
 * GET  /api/combo-campaigns          - list active campaigns (for UI display)
 * POST /api/combo-campaigns/evaluate - evaluate cart against all active campaigns
 */
@RestController
@RequestMapping("/api/combo-campaigns")
@RequiredArgsConstructor
@Tag(name = "Public – BYOC Campaigns", description = "Customer-facing BYOC combo APIs")
public class ComboCampaignPublicController {

    private final ComboCampaignService campaignService;

    @GetMapping
    @Operation(summary = "List all currently active BYOC campaigns")
    public ResponseEntity<List<ComboCampaignResponse>> listActive() {
        return ResponseEntity.ok(campaignService.listActive());
    }

    @PostMapping("/evaluate")
    @Operation(summary = "Evaluate cart against all active campaigns — returns discount progress & best discount")
    public ResponseEntity<ComboCartEvaluationResponse> evaluate(@RequestBody CartContext cart) {
        return ResponseEntity.ok(campaignService.evaluateCart(cart));
    }
}

