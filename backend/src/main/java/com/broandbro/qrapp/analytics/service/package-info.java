/**
 * <h2>analytics.service</h2>
 *
 * <p><b>Responsibility:</b> Contains all business logic for analytics computation.
 * Orchestrates repositories, caching (Redis), and projections.
 * Each service interface defines the contract; the {@code Impl} class holds the logic.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Interface suffix: {@code AnalyticsService}  — e.g. {@code RevenueAnalyticsService}</li>
 *   <li>Impl suffix:      {@code AnalyticsServiceImpl}</li>
 *   <li>Annotated with {@code @Service} + {@code @Transactional(readOnly = true)}</li>
 *   <li>Cache method-level results with {@code @Cacheable("analytics::<key>")}</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code DashboardAnalyticsService / Impl}  — aggregate summary for dashboard widget</li>
 *   <li>{@code OrderAnalyticsService    / Impl}   — order counts, hourly/daily trends</li>
 *   <li>{@code RevenueAnalyticsService  / Impl}   — GMV, AOV, refund metrics</li>
 *   <li>{@code UserAnalyticsService     / Impl}   — DAU/MAU, cohort retention</li>
 *   <li>{@code MenuAnalyticsService     / Impl}   — top items, category performance</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.service;

