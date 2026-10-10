package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PartnerAnalyticsOverviewResponse(
        Summary summary,
        Comparison comparison,
        List<TrendPoint> trend,
        List<StatusMetric> orderStatus,
        List<LocationMetric> locations,
        List<TopItemMetric> topItems,
        List<VendorMetric> vendors,
        List<HourlyMetric> hourlyDistribution
) {
    public record Summary(BigDecimal grossSales, long orders, BigDecimal averageOrderValue,
                          int activeLocations, long eligibleOrderCount, BigDecimal totalRevenue) {}
    public record Comparison(BigDecimal currentSales, BigDecimal previousSales, BigDecimal salesChangePercent,
                             long currentOrders, long previousOrders, BigDecimal ordersChangePercent,
                             BigDecimal currentAov, BigDecimal previousAov, BigDecimal aovChangePercent) {}
    public record TrendPoint(LocalDate date, BigDecimal sales, long orders) {}
    public record StatusMetric(String status, long orders) {}
    public record LocationMetric(Long locationId, String locationName, String locationCode,
                                 String relationshipType, String status, BigDecimal sales, long orders,
                                 BigDecimal averageOrderValue, BigDecimal growthPercent) {}
    public record TopItemMetric(int rank, String item, String vendor, long unitsSold,
                                BigDecimal revenue, BigDecimal sharePercent) {}
    public record VendorMetric(Long vendorId, String vendor, long orders, BigDecimal sales,
                               BigDecimal averageOrderValue) {}
    public record HourlyMetric(int hour, long orders, BigDecimal sales, BigDecimal sharePercent) {}
}
