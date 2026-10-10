package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class PartnerInsightsResponses {
    private PartnerInsightsResponses() {}

    public record Overview(Summary summary, Comparison comparison, List<TrendPoint> trend,
                           List<LocationMetric> locations) {}

    public record Engagement(Summary summary, List<TrendPoint> trend,
                             List<LocationMetric> locations) {}

    public record Menu(List<CategoryMetric> categories, List<ItemMetric> items,
                       BigDecimal totalRevenue) {}

    public record Summary(long activeEmployees, long orderingEmployees, BigDecimal orderingRate,
                          long repeatEmployees, BigDecimal repeatRate, long completedOrders,
                          BigDecimal ordersPerActiveEmployee, BigDecimal ordersPerOrderingEmployee,
                          BigDecimal averageSpendPerOrderingEmployee,
                          BigDecimal averageFrequency, BigDecimal totalSpend) {}

    public record Comparison(BigDecimal orderingEmployeesChangePercent, BigDecimal repeatEmployeesChangePercent,
                             BigDecimal ordersChangePercent, BigDecimal spendChangePercent) {}

    public record TrendPoint(LocalDate date, long activeEmployees, long newEmployees,
                             long returningEmployees, long orders, BigDecimal spend) {}

    public record LocationMetric(Long locationId, String locationName, String locationCode,
                                 long activeEmployees, long orderingEmployees, BigDecimal orderingRate,
                                 long repeatEmployees, BigDecimal repeatRate, long orders,
                                 BigDecimal averageSpend, BigDecimal spend) {}

    public record CategoryMetric(Long categoryId, String categoryName, long units,
                                 BigDecimal revenue, BigDecimal sharePercent) {}

    public record ItemMetric(Long itemId, String itemName, String categoryName, long units,
                             BigDecimal revenue, BigDecimal sharePercent) {}

    public record FeedbackSummary(boolean available, String status, String message,
                                  long total, long open) {}
}
