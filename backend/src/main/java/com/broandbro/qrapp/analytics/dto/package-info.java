/**
 * <h2>analytics.dto</h2>
 *
 * <p><b>Responsibility:</b> Immutable data-transfer objects used as the public contract
 * between the controller layer and the outside world.
 * DTOs decouple the API surface from internal entity/projection shapes.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Request suffix:  {@code Request}   — e.g. {@code AnalyticsDateRangeRequest}</li>
 *   <li>Response suffix: {@code Response}  — e.g. {@code RevenueAnalyticsResponse}</li>
 *   <li>Summary suffix:  {@code Summary}   — e.g. {@code OrderTrendSummary} (nested payload)</li>
 *   <li>Prefer Java 21 {@code record} types for immutability</li>
 *   <li>Use JSR-380 ({@code @NotNull}, {@code @DateTimeFormat}) on request records</li>
 * </ul>
 *
 * <p><b>Suggested records:</b></p>
 * <ul>
 *   <li>{@code AnalyticsDateRangeRequest}      — common {@code from}/{@code to} filter</li>
 *   <li>{@code DashboardSummaryResponse}       — top-level KPI snapshot</li>
 *   <li>{@code RevenueBreakdownResponse}       — daily/weekly/monthly revenue series</li>
 *   <li>{@code OrderTrendResponse}             — order volume time series</li>
 *   <li>{@code TopMenuItemResponse}            — ranked item with qty + revenue</li>
 *   <li>{@code UserGrowthResponse}             — new vs returning users series</li>
 *   <li>{@code PeakHourResponse}               — hour-of-day order distribution</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.dto;

