package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class PartnerAnalyticsProjections {
    private PartnerAnalyticsProjections() {}

    public interface Kpi {
        BigDecimal getGrossSales();
        Long getOrders();
        BigDecimal getAverageOrderValue();
    }

    public interface Location {
        Long getLocationId();
        BigDecimal getSales();
        Long getOrders();
    }

    public interface Status {
        String getStatus();
        Long getOrders();
    }

    public interface Vendor {
        Long getVendorId();
        String getVendorName();
        BigDecimal getSales();
        Long getOrders();
    }

    public interface TopItem {
        Long getItemId();
        String getItemName();
        String getVendorName();
        Long getUnitsSold();
        BigDecimal getRevenue();
    }

    public interface Trend {
        LocalDate getSalesDate();
        BigDecimal getSales();
        Long getOrders();
    }
}
