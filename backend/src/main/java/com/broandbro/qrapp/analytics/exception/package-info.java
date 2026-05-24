/**
 * <h2>analytics.exception</h2>
 *
 * <p><b>Responsibility:</b> Domain-specific exceptions for the analytics module,
 * plus a dedicated {@code @RestControllerAdvice} that translates them into
 * structured HTTP error responses — keeping analytics error handling isolated
 * from the rest of the application.</p>
 *
 * <p><b>Naming Conventions:</b></p>
 * <ul>
 *   <li>Exception suffix: {@code Exception}  — e.g. {@code AnalyticsDataNotFoundException}</li>
 *   <li>All exceptions extend {@code RuntimeException} (unchecked)</li>
 *   <li>Advice suffix:  {@code ExceptionHandler}  — {@code AnalyticsExceptionHandler}</li>
 *   <li>Include an {@code errorCode} string field for machine-readable client errors</li>
 * </ul>
 *
 * <p><b>Suggested classes:</b></p>
 * <ul>
 *   <li>{@code AnalyticsDataNotFoundException}
 *       — Thrown when a requested snapshot/report does not exist (→ 404)</li>
 *   <li>{@code AnalyticsDateRangeException}
 *       — Thrown when {@code from} &gt; {@code to} or range exceeds max allowed window (→ 400)</li>
 *   <li>{@code AnalyticsCacheException}
 *       — Thrown on Redis read/write failures in the analytics context (→ 503)</li>
 *   <li>{@code AnalyticsComputationException}
 *       — Thrown when an aggregation query or scheduler job fails unexpectedly (→ 500)</li>
 *   <li>{@code AnalyticsExceptionHandler} ({@code @RestControllerAdvice})
 *       — Handles all of the above and maps them to {@code ProblemDetail} (RFC 9457)</li>
 * </ul>
 */
package com.broandbro.qrapp.analytics.exception;

