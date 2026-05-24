/**
 * <h2>analytics.config</h2>
 *
 * <p><b>Responsibility:</b> Spring {@code @Configuration} classes scoped to the
 * analytics module. Wires Redis caches, task schedulers, and any
 * module-specific beans without polluting the global application config.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Class suffix: {@code Config}  — e.g. {@code AnalyticsCacheConfig}</li>
 *   <li>Annotated with {@code @Configuration} (+{@code @EnableScheduling} where appropriate)</li>
 *   <li>Bean method naming: lower-camel of the type — {@code analyticsRedisTemplate()}</li>
 *   <li>Cache name constants: define as {@code public static final String} inside the config class</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code AnalyticsCacheConfig}
 *       — Registers {@code RedisCacheManager} entries with TTLs per cache key:
 *       {@code analytics::dashboard} (5 min), {@code analytics::revenue} (15 min), etc.</li>
 *   <li>{@code AnalyticsSchedulerConfig}
 *       — Configures a dedicated {@code ThreadPoolTaskScheduler} for analytics jobs
 *       to avoid starving the main scheduler thread pool.</li>
 *   <li>{@code AnalyticsProperties}  ({@code @ConfigurationProperties(prefix = "analytics")})
 *       — Externalises cron expressions, cache TTLs, and feature flags.</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.config;

