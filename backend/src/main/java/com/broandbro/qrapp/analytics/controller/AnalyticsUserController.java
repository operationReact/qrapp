package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.RepeatCustomerResponse;
import com.broandbro.qrapp.analytics.dto.UserAggregateStatsResponse;
import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import com.broandbro.qrapp.analytics.service.UserAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
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
import org.springframework.security.core.Authentication;
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
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Users", description = "Customer segmentation and preference analytics")
public class AnalyticsUserController {

    private final UserAnalyticsService userService;
    private final AnalyticsScopeResolver scopeResolver;

    // ── GET /api/v1/analytics/users/preferences ────────────────────────────────

    @GetMapping("/preferences")
    @Operation(
        summary = "Aggregate user preference stats",
        description = "Returns dashboard-level stats: totalUsers, repeatCustomers, avgOrdersPerUser, favoriteItems, orderTimeDistribution."
    )
    public ResponseEntity<ApiResponse<UserAggregateStatsResponse>> getAggregateStats(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[UserController] GET /preferences (aggregate) locationId={}", locationId);
        return ResponseEntity.ok(ApiResponse.ok(userService.getAggregateStats(scope)));
    }

    // ── GET /api/v1/analytics/users/preferences/{userId} ───────────────────────

    @GetMapping("/preferences/{userId}")
    @Operation(
        summary = "Single user preference profile",
        description = "Returns the materialised preference and segmentation snapshot for a specific user."
    )
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getUserPreference(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[UserController] GET /preferences/{} locationId={}", userId, locationId);
        return userService.getUserPreference(userId, scope)
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
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[UserController] GET /repeat-customers limit={} locationId={}", limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(userService.getMostActiveUsers(limit, scope)));
    }

    // ── GET /api/v1/analytics/users/segment/{segment} ──────────────────────────

    @GetMapping("/segment/{segment}")
    @Operation(
        summary = "Users by segment",
        description = "Allowed segments: NEW, OCCASIONAL, REGULAR, VIP, AT_RISK, CHURNED"
    )
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getUsersBySegment(
            @PathVariable String segment,
            @RequestParam(required = false) Long locationId,
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[UserController] GET /segment/{} locationId={}", segment, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                userService.getUsersBySegment(segment.toUpperCase(), scope, pageable)));
    }

    // ── GET /api/v1/analytics/users/churned ────────────────────────────────────

    @GetMapping("/churned")
    @Operation(summary = "Churned users", description = "Users with no order in the last 30 days.")
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getChurnedUsers(
            @RequestParam(required = false) Long locationId,
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(userService.getChurnedUsers(scope, pageable)));
    }

    // ── GET /api/v1/analytics/users/top-spenders ───────────────────────────────

    @GetMapping("/top-spenders")
    @Operation(summary = "Top spenders (VIP leaderboard)")
    public ResponseEntity<ApiResponse<Page<UserPreferenceResponse>>> getTopSpenders(
            @RequestParam(required = false) Long locationId,
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(userService.getTopSpenders(scope, pageable)));
    }

    // ── GET /api/v1/analytics/users/repeat-rate ────────────────────────────────

    @GetMapping("/repeat-rate")
    @Operation(summary = "Repeat customer rate", description = "Returns the % of customers with >1 completed order.")
    public ResponseEntity<ApiResponse<Double>> getRepeatCustomerRate(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(userService.getRepeatCustomerRate(scope)));
    }
}
