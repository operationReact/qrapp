package com.broandbro.qrapp.analytics.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalised configuration for the analytics module.
 * Bound from {@code analytics.*} in application.yml.
 */
@Component
@ConfigurationProperties(prefix = "analytics")
@Getter
@Setter
public class AnalyticsProperties {

    private Cron cron = new Cron();
    private Cache cache = new Cache();
    private Limits limits = new Limits();

    @Getter
    @Setter
    public static class Cron {
        /** Daily sales snapshot — default: every day at 00:05 */
        private String dailySales = "0 5 0 * * *";
        /** Hourly order snapshot — default: every hour at :02 */
        private String hourlyOrders = "0 2 * * * *";
        /** Menu item snapshot — default: every day at 00:10 */
        private String menuItems = "0 10 0 * * *";
        /** User preference snapshot — default: every day at 01:00 */
        private String userPreferences = "0 0 1 * * *";
        /** Coupon analytics snapshot — default: every day at 00:15 */
        private String couponAnalytics = "0 15 0 * * *";
    }

    @Getter
    @Setter
    public static class Cache {
        /** TTL in seconds for dashboard KPI cache. Default: 300 (5 min) */
        private long dashboardTtlSeconds = 300;
        /** TTL in seconds for daily sales cache. Default: 900 (15 min) */
        private long dailySalesTtlSeconds = 900;
        /** TTL in seconds for hourly heatmap cache. Default: 600 (10 min) */
        private long hourlyOrdersTtlSeconds = 600;
        /** TTL in seconds for top menu items cache. Default: 900 (15 min) */
        private long menuItemsTtlSeconds = 900;
        /** TTL in seconds for coupon analytics cache. Default: 900 (15 min) */
        private long couponAnalyticsTtlSeconds = 900;
        /** TTL in seconds for recommendations cache. Default: 1800 (30 min) */
        private long recommendationsTtlSeconds = 1800;
    }

    @Getter
    @Setter
    public static class Limits {
        /** Maximum number of top items to return per query. */
        private int maxTopItems = 50;
        /** Maximum date range in days allowed per API request. */
        private int maxDateRangeDays = 365;
        /** Abuse signal threshold: repeat_user_count > this value triggers alert. */
        private int abuseDetectionThreshold = 1;
        /** Days of inactivity after which a user is considered churned. */
        private int churnThresholdDays = 30;
    }
}

