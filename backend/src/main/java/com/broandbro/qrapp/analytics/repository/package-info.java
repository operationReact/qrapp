/**
 * <h2>analytics.repository</h2>
 *
 * <p><b>Responsibility:</b> Data-access layer for analytics entities and
 * heavy read-only aggregate queries against PostgreSQL.
 * Repositories must <b>not</b> contain business logic.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Interface suffix: {@code Repository}  — e.g. {@code AnalyticsSnapshotRepository}</li>
 *   <li>Extend {@code JpaRepository<E, ID>} for CRUD entities</li>
 *   <li>Extend {@code JpaRepository} with {@code @Query} + {@code Projection} interfaces
 *       for heavy aggregates (avoid loading full entities)</li>
 *   <li>Native queries: annotated with {@code @Query(nativeQuery = true)} when
 *       JPQL cannot express window functions / CTEs</li>
 * </ul>
 *
 * <p><b>Suggested interfaces:</b></p>
 * <ul>
 *   <li>{@code AnalyticsSnapshotRepository}   — CRUD for pre-computed snapshot rows</li>
 *   <li>{@code OrderAnalyticsRepository}      — aggregate queries on orders table</li>
 *   <li>{@code RevenueAnalyticsRepository}    — revenue roll-ups with date ranges</li>
 *   <li>{@code UserAnalyticsRepository}       — user activity aggregation queries</li>
 *   <li>{@code MenuAnalyticsRepository}       — item/category performance queries</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.repository;

