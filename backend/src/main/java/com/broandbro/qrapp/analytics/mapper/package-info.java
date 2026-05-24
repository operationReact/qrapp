/**
 * <h2>analytics.mapper</h2>
 *
 * <p><b>Responsibility:</b> Converts between entities/projections and DTOs.
 * Keeps transformation logic out of services and controllers, acting as a
 * dedicated translation layer.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Class suffix: {@code Mapper}  — e.g. {@code RevenueAnalyticsMapper}</li>
 *   <li>Annotated with {@code @Component} (manual) or use MapStruct {@code @Mapper(componentModel = "spring")}</li>
 *   <li>Method naming:
 *     <ul>
 *       <li>{@code toDto(Entity / Projection)} → DTO</li>
 *       <li>{@code toEntity(DTO)}              → Entity</li>
 *       <li>{@code toDtoList(List<...>)}       → List of DTO</li>
 *     </ul>
 *   </li>
 *   <li>Mappers must be stateless — no service injection</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code RevenueAnalyticsMapper}   — RevenueSnapshot ↔ RevenueBreakdownResponse</li>
 *   <li>{@code OrderAnalyticsMapper}     — OrderSnapshot / projection ↔ OrderTrendResponse</li>
 *   <li>{@code UserAnalyticsMapper}      — UserActivitySnapshot ↔ UserGrowthResponse</li>
 *   <li>{@code MenuAnalyticsMapper}      — MenuItemSnapshot / projection ↔ TopMenuItemResponse</li>
 *   <li>{@code DashboardAnalyticsMapper} — Composes multiple partials → DashboardSummaryResponse</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.mapper;

