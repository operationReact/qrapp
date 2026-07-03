/**
 * <h2>analytics.scheduler</h2>
 *
 * <p><b>Responsibility:</b> Time-driven background jobs that pre-compute, aggregate,
 * and cache analytics snapshots. Keeps hot read paths fast by writing results to
 * Redis and/or a materialised summary table ahead of time.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Class suffix: {@code Scheduler}  — e.g. {@code DailyRevenueSnapshotScheduler}</li>
 *   <li>Annotated with {@code @Component} + {@code @EnableScheduling} (via config)</li>
 *   <li>Method naming: {@code compute<Metric>Snapshot()}, {@code evict<Metric>Cache()}</li>
 *   <li>Cron strings: externalised in {@code application.yml} under {@code analytics.cron.*}</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code DailyRevenueSnapshotScheduler}  — rolls up daily revenue at midnight</li>
 *   <li>{@code HourlyOrderTrendScheduler}      — aggregates order volume every hour</li>
 *   <li>{@code WeeklyUserRetentionScheduler}   — computes cohort retention weekly</li>
 *   <li>{@code AnalyticsCacheEvictionScheduler}— bulk-invalidates stale Redis keys</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.scheduler;

