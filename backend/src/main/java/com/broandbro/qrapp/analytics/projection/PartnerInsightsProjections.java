package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class PartnerInsightsProjections {
    private PartnerInsightsProjections() {}

    public interface EmployeeSummary {
        Long getActiveEmployees();
        Long getOrderingEmployees();
        Long getRepeatEmployees();
        Long getCompletedOrders();
        BigDecimal getSpend();
    }

    public interface Trend {
        LocalDate getDate();
        Long getActiveEmployees();
        Long getNewEmployees();
        Long getReturningEmployees();
        Long getOrders();
        BigDecimal getSpend();
    }

    public interface Location {
        Long getLocationId();
        Long getActiveEmployees();
        Long getOrderingEmployees();
        Long getRepeatEmployees();
        Long getOrders();
        BigDecimal getSpend();
    }

    public interface Category {
        Long getCategoryId();
        String getCategoryName();
        Long getUnits();
        BigDecimal getRevenue();
    }

    public interface Item {
        Long getItemId();
        String getItemName();
        String getCategoryName();
        Long getUnits();
        BigDecimal getRevenue();
    }
}
