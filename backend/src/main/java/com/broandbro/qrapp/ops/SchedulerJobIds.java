package com.broandbro.qrapp.ops;

/** Stable job IDs shared by the schedulers (which record runs) and the registry (which lists them). */
public final class SchedulerJobIds {

    public static final String DAILY_SALES = "daily-sales";
    public static final String DAILY_SALES_INTRADAY = "daily-sales-intraday";
    public static final String HOURLY_ANALYTICS = "hourly-analytics";
    public static final String MENU_ANALYTICS = "menu-analytics";
    public static final String MENU_ANALYTICS_INTRADAY = "menu-analytics-intraday";
    public static final String COUPON_ANALYTICS = "coupon-analytics";
    public static final String COUPON_ANALYTICS_INTRADAY = "coupon-analytics-intraday";
    public static final String USER_PREFERENCES = "user-preferences";
    public static final String CO_OCCURRENCE = "co-occurrence";
    public static final String REFUND_SWEEP = "refund-sweep";
    public static final String WHATSAPP_OUTBOX = "whatsapp-outbox";
    public static final String RUN_HISTORY_CLEANUP = "run-history-cleanup";

    private SchedulerJobIds() {
    }
}
