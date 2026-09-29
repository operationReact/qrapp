package com.broandbro.qrapp.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Eagerly establishes the HikariCP pool's minimum-idle connections right after
 * startup instead of leaving that cost to be paid lazily by the first
 * customer-facing request.
 *
 * <p>Without this, the very first request after the app starts (or after the
 * pooled connections go stale/dead — e.g. silently dropped by a NAT/firewall
 * on the network path to a remote AWS RDS instance) can block for up to
 * {@code spring.datasource.hikari.connection-timeout} (30s) while a fresh
 * connection is negotiated. Running a trivial query here forces that cost
 * onto application boot, where it doesn't affect perceived API latency, and
 * surfaces connectivity problems immediately in the startup logs.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSourceWarmUp {

    private final DataSource dataSource;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        long start = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            log.info("Database connection pool warmed up in {}ms", System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.warn("Database warm-up query failed after {}ms — first request may be slow while the pool "
                    + "establishes a connection: {}", System.currentTimeMillis() - start, e.getMessage());
        }
    }
}
