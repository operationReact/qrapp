/**
 * <h2>analytics.projection</h2>
 *
 * <p><b>Responsibility:</b> Spring Data JPA projection interfaces (and/or records) that
 * represent the exact column set returned by aggregate {@code @Query} methods.
 * Using projections avoids loading full entity graphs for read-only analytics
 * queries, dramatically reducing memory pressure.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Interface suffix: {@code Projection}  — e.g. {@code RevenueSummaryProjection}</li>
 *   <li>Each getter maps 1-to-1 to a column alias in the {@code @Query} SELECT clause</li>
 *   <li>Prefer closed projections (interface with only needed getters) over open ones</li>
 *   <li>For native queries returning tuples, use {@code @SqlResultSetMapping} or class-based projections</li>
 * </ul>
 *
 * <p><b>Suggested interfaces:</b></p>
 * <ul>
 *   <li>{@code RevenueSummaryProjection}    — {@code getDate()}, {@code getTotalRevenue()}, {@code getOrderCount()}</li>
 *   <li>{@code OrderTrendProjection}        — {@code getHour()}, {@code getDayOfWeek()}, {@code getOrderCount()}</li>
 *   <li>{@code TopMenuItemProjection}       — {@code getItemId()}, {@code getItemName()}, {@code getTotalQty()}, {@code getTotalRevenue()}</li>
 *   <li>{@code UserGrowthProjection}        — {@code getPeriod()}, {@code getNewUsers()}, {@code getReturningUsers()}</li>
 *   <li>{@code CategoryRevenueProjection}   — {@code getCategoryId()}, {@code getCategoryName()}, {@code getRevenue()}</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.projection;

