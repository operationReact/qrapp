package com.broandbro.qrapp.analytics.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.TimeUnit;

/**
 * Analytics module cache and scheduler configuration.
 *
 * <p>Registers a dedicated Caffeine {@link CacheManager} bean named
 * {@code analyticsCacheManager} with per-cache TTLs so analytics caches
 * are fully isolated from the main application cache.</p>
 *
 * <p>Also provisions a dedicated {@link ThreadPoolTaskScheduler} so
 * analytics cron jobs cannot starve the main application task executor.</p>
 */
@Configuration
@EnableScheduling
@EnableCaching
@RequiredArgsConstructor
public class AnalyticsCacheConfig {

    // ── Cache name constants — use these in @Cacheable annotations ────────────
    public static final String CACHE_DASHBOARD        = "analytics::dashboard";
    public static final String CACHE_DAILY_SALES      = "analytics::daily-sales";
    public static final String CACHE_HOURLY_ORDERS    = "analytics::hourly-orders";
    public static final String CACHE_PEAK_HOURS       = "analytics::peak-hours";
    public static final String CACHE_TOP_ITEMS        = "analytics::top-items";
    public static final String CACHE_CATEGORY_ROLLUP  = "analytics::category-rollup";
    public static final String CACHE_USER_SEGMENT     = "analytics::user-segment";
    public static final String CACHE_COUPON_PERF      = "analytics::coupon-perf";
    public static final String CACHE_RECOMMENDATIONS  = "analytics::recommendations";
    public static final String CACHE_PROFITABILITY    = "analytics::profitability";

    private final AnalyticsProperties props;

    // ── Primary (app-level) cache manager ─────────────────────────────────────
    //
    // Spring Boot's CaffeineCacheAutoConfiguration is @ConditionalOnMissingBean(CacheManager.class).
    // Because we define analyticsCacheManager below, the auto-configuration is suppressed and the
    // app-level caches (walletBalance, menu, menuRecommended) would silently disappear.
    // This @Primary bean restores them and becomes the default for @Cacheable annotations that do
    // NOT specify cacheManager="analyticsCacheManager" explicitly.

    @Bean
    @Primary
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                "walletBalance", "menu", "menuRecommended",
                "combos", "signatureProducts");  // Combo & Signature Product caches
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .recordStats());
        return manager;
    }

    @Bean("analyticsCacheManager")
    public CacheManager analyticsCacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                CACHE_DASHBOARD,
                CACHE_DAILY_SALES,
                CACHE_HOURLY_ORDERS,
                CACHE_PEAK_HOURS,
                CACHE_TOP_ITEMS,
                CACHE_CATEGORY_ROLLUP,
                CACHE_USER_SEGMENT,
                CACHE_COUPON_PERF,
                CACHE_RECOMMENDATIONS
        );

        // Per-cache TTL support: register individual Caffeine specs
        manager.registerCustomCache(CACHE_DASHBOARD,
                buildCache(props.getCache().getDashboardTtlSeconds()));
        manager.registerCustomCache(CACHE_DAILY_SALES,
                buildCache(props.getCache().getDailySalesTtlSeconds()));
        manager.registerCustomCache(CACHE_HOURLY_ORDERS,
                buildCache(props.getCache().getHourlyOrdersTtlSeconds()));
        manager.registerCustomCache(CACHE_PEAK_HOURS,
                buildCache(props.getCache().getHourlyOrdersTtlSeconds()));
        manager.registerCustomCache(CACHE_TOP_ITEMS,
                buildCache(props.getCache().getMenuItemsTtlSeconds()));
        manager.registerCustomCache(CACHE_CATEGORY_ROLLUP,
                buildCache(props.getCache().getMenuItemsTtlSeconds()));
        manager.registerCustomCache(CACHE_USER_SEGMENT,
                buildCache(props.getCache().getDailySalesTtlSeconds()));
        manager.registerCustomCache(CACHE_COUPON_PERF,
                buildCache(props.getCache().getCouponAnalyticsTtlSeconds()));
        manager.registerCustomCache(CACHE_RECOMMENDATIONS,
                buildCache(props.getCache().getRecommendationsTtlSeconds()));

        return manager;
    }

    /** Dedicated thread pool for analytics schedulers — isolated from main executor. */
    @Bean("analyticsTaskScheduler")
    public ThreadPoolTaskScheduler analyticsTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(3);
        scheduler.setThreadNamePrefix("analytics-scheduler-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);
        scheduler.initialize();
        return scheduler;
    }

    private com.github.benmanes.caffeine.cache.Cache<Object, Object> buildCache(long ttlSeconds) {
        return Caffeine.newBuilder()
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .maximumSize(500)
                .recordStats()   // enables Micrometer hit/miss/eviction metrics
                .build();
    }
}

