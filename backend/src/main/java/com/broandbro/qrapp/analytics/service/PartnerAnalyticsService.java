package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.PartnerAnalyticsOverviewResponse;
import com.broandbro.qrapp.analytics.projection.PartnerAnalyticsProjections;
import com.broandbro.qrapp.analytics.repository.PartnerAnalyticsRepository;
import com.broandbro.qrapp.analytics.repository.HourlyOrderAnalyticsRepository;
import com.broandbro.qrapp.entity.PartnerLocation;
import com.broandbro.qrapp.service.PartnerAccessService;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerAnalyticsService {
    private final PartnerAccessService accessService;
    private final PartnerAnalyticsRepository repository;
    private final HourlyOrderAnalyticsRepository hourlyRepository;

    public PartnerAnalyticsOverviewResponse overview(
            org.springframework.security.core.Authentication authentication,
            Long requestedLocationId, LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("startDate must not be after endDate");
        if (from.plusDays(365).isBefore(to)) throw new IllegalArgumentException("Analytics range must not exceed 365 days");
        if (to.isAfter(BusinessTime.today())) throw new IllegalArgumentException("Analytics dates cannot be in the future");

        List<PartnerLocation> accessible = accessService.accessibleLocations(authentication);
        if (requestedLocationId != null) {
            PartnerLocation selected = accessService.accessibleLocation(requestedLocationId, authentication);
            accessible = accessible.stream()
                    .filter(location -> location.getLocation().getId().equals(selected.getLocation().getId()))
                    .toList();
        }
        List<Long> locationIds = accessible.stream().map(location -> location.getLocation().getId()).toList();
        if (locationIds.isEmpty()) return emptyResponse(from, to);

        LocalDate previousTo = from.minusDays(1);
        LocalDate previousFrom = previousTo.minusDays(to.toEpochDay() - from.toEpochDay());
        PartnerAnalyticsProjections.Kpi current = repository.aggregateKpi(from, to, locationIds);
        PartnerAnalyticsProjections.Kpi previous = repository.aggregateKpi(previousFrom, previousTo, locationIds);
        BigDecimal currentSales = money(current.getGrossSales());
        BigDecimal previousSales = money(previous.getGrossSales());

        List<PartnerAnalyticsOverviewResponse.LocationMetric> locations = locationMetrics(
                repository.locations(from, to, locationIds), repository.locations(previousFrom, previousTo, locationIds), accessible);
        List<PartnerAnalyticsProjections.TopItem> itemRows = repository.topItems(from, to, locationIds);
        BigDecimal itemRevenue = itemRows.stream().map(row -> money(row.getRevenue())).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PartnerAnalyticsOverviewResponse(
                new PartnerAnalyticsOverviewResponse.Summary(currentSales, number(current.getOrders()),
                        money(current.getAverageOrderValue()), accessible.size(), number(current.getOrders()), currentSales),
                new PartnerAnalyticsOverviewResponse.Comparison(currentSales, previousSales, percent(currentSales, previousSales),
                        number(current.getOrders()), number(previous.getOrders()), percent(number(current.getOrders()), number(previous.getOrders())),
                        money(current.getAverageOrderValue()), money(previous.getAverageOrderValue()),
                        percent(current.getAverageOrderValue(), previous.getAverageOrderValue())),
                repository.trend(from, to, locationIds).stream()
                        .map(row -> new PartnerAnalyticsOverviewResponse.TrendPoint(row.getSalesDate(), money(row.getSales()), number(row.getOrders()))).toList(),
                repository.statuses(startOf(from), startOf(to.plusDays(1)), locationIds).stream()
                        .map(row -> new PartnerAnalyticsOverviewResponse.StatusMetric(row.getStatus(), number(row.getOrders()))).toList(),
                locations,
                topItems(itemRows, itemRevenue),
                repository.vendors(from, to, locationIds).stream()
                        .map(row -> new PartnerAnalyticsOverviewResponse.VendorMetric(row.getVendorId(), row.getVendorName(),
                                number(row.getOrders()), money(row.getSales()), divide(row.getSales(), row.getOrders()))).toList(),
                hourlyDistribution(from, to, locationIds)
        );
    }

    private List<PartnerAnalyticsOverviewResponse.LocationMetric> locationMetrics(
            List<PartnerAnalyticsProjections.Location> current,
            List<PartnerAnalyticsProjections.Location> previous,
            List<PartnerLocation> accessible) {
        Map<Long, PartnerAnalyticsProjections.Location> currentById = current.stream()
                .collect(Collectors.toMap(PartnerAnalyticsProjections.Location::getLocationId, Function.identity()));
        Map<Long, PartnerAnalyticsProjections.Location> previousById = previous.stream()
                .collect(Collectors.toMap(PartnerAnalyticsProjections.Location::getLocationId, Function.identity()));
        return accessible.stream().map(link -> {
            var location = link.getLocation();
            var row = currentById.get(link.getLocation().getId());
            var before = previousById.get(link.getLocation().getId());
            BigDecimal sales = row == null ? BigDecimal.ZERO : money(row.getSales());
            long orders = row == null ? 0 : number(row.getOrders());
            return new PartnerAnalyticsOverviewResponse.LocationMetric(location.getId(), location.getName(),
                    location.getCode(), link.getRelationshipType().name(), link.getStatus().name(), sales, orders,
                    divide(sales, orders), percent(sales, before == null ? BigDecimal.ZERO : before.getSales()));
        }).toList();
    }

    private List<PartnerAnalyticsOverviewResponse.HourlyMetric> hourlyDistribution(
            LocalDate from, LocalDate to, Collection<Long> locationIds) {
        var rows = hourlyRepository.findHeatmapByDateRange(from, to, false, List.copyOf(locationIds));
        long total = rows.stream().mapToLong(row -> number(row.getTotalOrderCount())).sum();
        return rows.stream().map(row -> new PartnerAnalyticsOverviewResponse.HourlyMetric(
                row.getHourOfDay(), number(row.getTotalOrderCount()), money(row.getTotalRevenue()),
                percent(BigDecimal.valueOf(number(row.getTotalOrderCount())), BigDecimal.valueOf(total)))).toList();
    }

    private List<PartnerAnalyticsOverviewResponse.TopItemMetric> topItems(
            List<PartnerAnalyticsProjections.TopItem> rows, BigDecimal totalRevenue) {
        AtomicInteger rank = new AtomicInteger();
        return rows.stream().map(row -> new PartnerAnalyticsOverviewResponse.TopItemMetric(
                rank.incrementAndGet(), row.getItemName(), row.getVendorName(), number(row.getUnitsSold()),
                money(row.getRevenue()), percent(money(row.getRevenue()), totalRevenue))).toList();
    }

    private PartnerAnalyticsOverviewResponse emptyResponse(LocalDate from, LocalDate to) {
        return new PartnerAnalyticsOverviewResponse(
                new PartnerAnalyticsOverviewResponse.Summary(BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, 0, BigDecimal.ZERO),
                new PartnerAnalyticsOverviewResponse.Comparison(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    }
    private String startOf(LocalDate date) { return date.atStartOfDay().toString(); }
    private BigDecimal money(BigDecimal value) { return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP); }
    private long number(Number value) { return value == null ? 0 : value.longValue(); }
    private BigDecimal divide(BigDecimal sales, Number orders) { return divide(sales, number(orders)); }
    private BigDecimal divide(BigDecimal sales, long orders) { return orders == 0 ? BigDecimal.ZERO : money(sales).divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP); }
    private BigDecimal percent(Number current, Number previous) { return percent(BigDecimal.valueOf(number(current)), BigDecimal.valueOf(number(previous))); }
    private BigDecimal percent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return current.signum() == 0 ? BigDecimal.ZERO : null;
        return current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous, 2, RoundingMode.HALF_UP);
    }
}
