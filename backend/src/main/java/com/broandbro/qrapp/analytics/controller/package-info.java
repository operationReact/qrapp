/**
 * <h2>analytics.controller</h2>
 *
 * <p><b>Responsibility:</b> Exposes REST endpoints for analytics data consumption.
 * Controllers are thin — they delegate all logic to the service layer.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Class suffix: {@code Controller}  — e.g. {@code AnalyticsDashboardController}</li>
 *   <li>Base path: {@code /api/v1/analytics/...}</li>
 *   <li>Annotated with {@code @RestController} + {@code @RequestMapping}</li>
 *   <li>Return types: always {@code ResponseEntity<ApiResponse<T>>}</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code AnalyticsDashboardController}  — aggregate KPIs (revenue, orders, users)</li>
 *   <li>{@code OrderAnalyticsController}      — order volume, trend, peak-hour reports</li>
 *   <li>{@code RevenueAnalyticsController}    — revenue breakdown by date / category</li>
 *   <li>{@code UserAnalyticsController}       — user growth, retention, cohort data</li>
 *   <li>{@code MenuAnalyticsController}       — item popularity, conversion, drop-off</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.controller;

