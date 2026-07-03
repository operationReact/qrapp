/**
 * <h2>analytics.entity</h2>
 *
 * <p><b>Responsibility:</b> JPA entities that map to analytics-specific PostgreSQL tables —
 * primarily materialised snapshots and event-log rows written by schedulers or
 * domain event listeners. Avoid storing raw transactional data here; read that
 * from the core domain tables via repositories.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>No suffix — use descriptive domain nouns: {@code AnalyticsSnapshot}, {@code RevenueSnapshot}</li>
 *   <li>Table prefix: {@code analytics_*}  — e.g. {@code analytics_revenue_snapshot}</li>
 *   <li>Annotated with {@code @Entity} + {@code @Table(name = "analytics_...")}</li>
 *   <li>Always include {@code createdAt} ({@code @CreationTimestamp}) for audit trail</li>
 *   <li>Use {@code @Index} on frequently filtered columns (date, type)</li>
 * </ul>
 *
 * <p><b>Suggested entities:</b></p>
 * <ul>
 *   <li>{@code RevenueSnapshot}     — daily/weekly GMV pre-computed by scheduler</li>
 *   <li>{@code OrderSnapshot}       — hourly order count + average value</li>
 *   <li>{@code UserActivitySnapshot}— DAU/MAU figures per period</li>
 *   <li>{@code MenuItemSnapshot}    — per-item sales rank stored periodically</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.entity;

