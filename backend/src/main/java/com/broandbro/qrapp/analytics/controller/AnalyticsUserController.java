package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.RepeatCustomerResponse;
import com.broandbro.qrapp.analytics.dto.UserAggregateStatsResponse;
import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import com.broandbro.qrapp.analytics.service.UserAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User analytics endpoints.
 *
 * <pre>
 * GET /api/v1/analytics/users/preferences          — single user profile
 * GET /api/v1/analytics/users/segment/{segment}    — users by RFM segment
 * GET /api/v1/analytics/users/churned              — churned users
 * GET /api/v1/analytics/users/top-spenders         — VIP leaderboard
 * GET /api/v1/analytics/users/repeat-rate          — repeat customer rate (%)
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/users")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER')")
@Tag(name = "Analytics — Users", description = "Customer segmentation and preference analytics")
public class AnalyticsUserController {

    private final UserAnalyticsService userService;

    // ── GET /api/v1/analytics/users/preferences ────────────────────────────────

    @GetMapping("/preferences")
    @Operation(
        summary = "Aggregate user preference stats",
        description = "Returns dashboard-level stats: totalUsers, repeatCustomers, avgOrdersPerUser, favoriteItems, orderTimeDistribution."
    )
    public ResponseEntity<ApiResponse<UserAggregateStatsResponse>> getAggregateStats() {
        log.debug("[UserController] GET /preferences (aggregate)");
        return ResponseEntity.ok(ApiResponse.ok(userService.getAggregateStats()));
    }

    // ── GET /api/v1/analytics/users/preferences/{userId} ───────────────────────

    @GetMapping("/preferences/{userId}")
    @Operation(
        summary = "Single user preference profile",
        description = "Returns the materialised preference and segmentation snapshot for a specific user."
    )
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getUserPreference(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId) {

        log.debug("[UserController] GET /preferences/{}", userId);
        return userService.getUserPreference(userId)
                .map(p -> ResponseEntity.ok(ApiResponse.ok(p)))
                .orElseGet(() -> ResponseEntity.ok(
                        ApiResponse.error("No analytics snapshot found for userId=" + userId)));
    }

    // ── GET /api/v1/analytics/users/repeat-customers ───────────────────────────

    @GetMapping("/repeat-customers")
    @Operation(
        summary = "Most active users",
        description = "Returns the top N users by completed order count, with total spend and favourite item."
    )
    public ResponseEntity<ApiResponse<List<RepeatCustomerResponse>>> getMostActiveUsers(
            @Parameter(description = "Maximum number of users to return (default 20)")
            @RequestParam(defaultValue = "20") int limit) {

        log.debug("[UserController] GET /repeat-customers limit={}", limit);
        return ResponseEntity.ok(ApiResponse.ok(userService.getMostActiveUsers(limit)));
    }

    // ── GET /api/v1/analytics/users/segment/{segment} ──────────────────────────

    @GetMapping("/segment/{segment}")
    @Operation(
        summary = "Users by segment",
        description = "Allowed segments: NEW, OCCASIONAL, REGULAR, VIP, AT_RISK, CHURNED"
    )
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getUsersBySegment(
            @PathVariable String segment,
            @PageableDefault(size = 20) Pageable pageable) {

        log.debug("[UserController] GET /segment/{}", segment);
        return ResponseEntity.ok(ApiResponse.ok(
                userService.getUsersBySegment(segment.toUpperCase(), pageable)));
    }

    // ── GET /api/v1/analytics/users/churned ────────────────────────────────────

    @GetMapping("/churned")
    @Operation(summary = "Churned users", description = "Users with no order in the last 30 days.")
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getChurnedUsers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getChurnedUsers(pageable)));
    }

    // ── GET /api/v1/analytics/users/top-spenders ───────────────────────────────

    @GetMapping("/top-spenders")
    @Operation(summary = "Top spenders (VIP leaderboard)")
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getTopSpenders(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getTopSpenders(pageable)));
    }

    // ── GET /api/v1/analytics/users/repeat-rate ────────────────────────────────

    @GetMapping("/repeat-rate")
    @Operation(summary = "Repeat customer rate", description = "Returns the % of customers with >1 completed order.")
    public ResponseEntity<ApiResponse<Double>> getRepeatCustomerRate() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getRepeatCustomerRate()));
    }
}
