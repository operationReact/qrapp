/**
 * <h1>Analytics Engine Module</h1>
 *
 * <p>Self-contained analytics feature module living inside the
 * {@code com.broandbro.qrapp} application.</p>
 *
 * <h2>Module Boundaries</h2>
 * <pre>
 * com.broandbro.qrapp.analytics
 * ├── config        — Redis cache + scheduler bean wiring, @ConfigurationProperties
 * ├── controller    — REST API surface  (/api/v1/analytics/**)
 * ├── dto           — Immutable request/response records (Java 21 records)
 * ├── entity        — JPA entities for materialised snapshots (analytics_* tables)
 * ├── exception     — Domain exceptions + @RestControllerAdvice
 * ├── mapper        — Entity/Projection → DTO transformations (MapStruct / manual)
 * ├── projection    — Spring Data JPA closed projection interfaces
 * ├── repository    — JPA repositories with aggregate @Query methods
 * ├── scheduler     — @Scheduled jobs that pre-compute and cache metrics
 * └── service       — Business logic, Redis @Cacheable, orchestration
 * </pre>
 *
 * <h2>Data Flow</h2>
 * <pre>
 * HTTP Request
 *     → Controller
 *         → Service  (@Cacheable — Redis)
 *             → Repository  (PostgreSQL aggregate query → Projection)
 *             → Mapper      (Projection → DTO)
 *         ← DTO
 *     ← ResponseEntity
 *
 * Scheduler (cron)
 *     → Service.computeSnapshot()
 *         → Repository (read domain tables)
 *         → SnapshotRepository.save(entity)   (write analytics_* table)
 *         → RedisTemplate.opsForValue().set()  (warm cache)
 * </pre>
 *
 * <h2>Key Design Decisions</h2>
 * <ul>
 *   <li><b>Snapshots over live queries</b> — Schedulers materialise heavy aggregates
 *       into {@code analytics_*} tables; controllers read snapshots, not live data.</li>
 *   <li><b>Two-level caching</b> — Redis L1 cache (short TTL) sits in front of the
 *       PostgreSQL snapshot table (L2). Cache miss falls through to the DB, never to
 *       raw transactional tables during a user request.</li>
 *   <li><b>Projections over entities</b> — All read-only aggregate queries return
 *       Spring Data projection interfaces to avoid loading unnecessary columns.</li>
 *   <li><b>Flyway-managed schema</b> — Analytics tables are versioned under
 *       {@code db/migration/V<n>__create_analytics_*.sql}.</li>
 *   <li><b>Dedicated scheduler thread pool</b> — Configured in {@code AnalyticsSchedulerConfig}
 *       so analytics jobs cannot block the main application task executor.</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics;

