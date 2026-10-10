package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.PartnerInsightsResponses;
import com.broandbro.qrapp.analytics.projection.PartnerInsightsProjections;
import com.broandbro.qrapp.analytics.repository.PartnerInsightsRepository;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerInsightsService {
    private final PartnerAccessService accessService;
    private final PartnerInsightsRepository repository;

    public PartnerInsightsResponses.Overview overview(org.springframework.security.core.Authentication auth,
                                                       Long locationId, LocalDate from, LocalDate to) {
        Scope scope = scope(auth, locationId, from, to);
        PartnerInsightsProjections.EmployeeSummary current = summary(scope, from, to);
        LocalDate previousTo = from.minusDays(1);
        LocalDate previousFrom = previousTo.minusDays(to.toEpochDay() - from.toEpochDay());
        PartnerInsightsProjections.EmployeeSummary previous = summary(scope, previousFrom, previousTo);
        return new PartnerInsightsResponses.Overview(toSummary(current),
                comparison(current, previous), trend(scope, from, to),
                locationMetrics(scope, from, to));
    }

    public PartnerInsightsResponses.Engagement engagement(org.springframework.security.core.Authentication auth,
                                                          Long locationId, LocalDate from, LocalDate to) {
        Scope scope = scope(auth, locationId, from, to);
        return new PartnerInsightsResponses.Engagement(
                toSummary(summary(scope, from, to)), trend(scope, from, to),
                locationMetrics(scope, from, to));
    }

    public PartnerInsightsResponses.Menu menu(org.springframework.security.core.Authentication auth,
                                             Long locationId, LocalDate from, LocalDate to) {
        Scope scope = scope(auth, locationId, from, to);
        if (scope.locationIds().isEmpty()) {
            return new PartnerInsightsResponses.Menu(List.of(), List.of(), BigDecimal.ZERO);
        }
        List<PartnerInsightsProjections.Category> categories =
                repository.categories(at(from), at(to.plusDays(1)), scope.locationIds());
        List<PartnerInsightsProjections.Item> items =
                repository.items(at(from), at(to.plusDays(1)), scope.locationIds());
        BigDecimal total = categories.stream().map(row -> money(row.getRevenue()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PartnerInsightsResponses.Menu(
                categories.stream().map(row -> new PartnerInsightsResponses.CategoryMetric(
                        row.getCategoryId(), row.getCategoryName(), number(row.getUnits()),
                        money(row.getRevenue()), share(row.getRevenue(), total))).toList(),
                items.stream().map(row -> new PartnerInsightsResponses.ItemMetric(
                        row.getItemId(), row.getItemName(), row.getCategoryName(), number(row.getUnits()),
                        money(row.getRevenue()), share(row.getRevenue(), total))).toList(), money(total));
    }

    public List<PartnerInsightsResponses.LocationMetric> locations(
            org.springframework.security.core.Authentication auth, Long locationId,
            LocalDate from, LocalDate to) {
        return locationMetrics(scope(auth, locationId, from, to), from, to);
    }

    public PartnerInsightsResponses.FeedbackSummary feedback(
            org.springframework.security.core.Authentication auth, Long locationId,
            LocalDate from, LocalDate to) {
        scope(auth, locationId, from, to);
        return new PartnerInsightsResponses.FeedbackSummary(false, "UNAVAILABLE",
                "Feedback and complaint tracking is not available because no feedback source exists yet.", 0, 0);
    }

    private Scope scope(org.springframework.security.core.Authentication auth, Long requested,
                        LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to))
            throw new IllegalArgumentException("startDate must not be after endDate");
        if (from.plusDays(365).isBefore(to))
            throw new IllegalArgumentException("Insights range must not exceed 365 days");
        if (to.isAfter(BusinessTime.today()))
            throw new IllegalArgumentException("Insights dates cannot be in the future");
        List<PartnerLocation> accessible = accessService.accessibleLocations(auth);
        if (requested != null) {
            PartnerLocation selected = accessService.accessibleLocation(requested, auth);
            accessible = accessible.stream()
                    .filter(link -> link.getLocation().getId().equals(selected.getLocation().getId())).toList();
        }
        return new Scope(accessible, accessible.stream().map(link -> link.getLocation().getId()).toList());
    }

    private PartnerInsightsProjections.EmployeeSummary summary(Scope scope, LocalDate from, LocalDate to) {
        if (scope.locationIds().isEmpty()) return new EmptySummary();
        return repository.employeeSummary(at(from), at(to.plusDays(1)), scope.locationIds());
    }

    private List<PartnerInsightsResponses.TrendPoint> trend(Scope scope, LocalDate from, LocalDate to) {
        if (scope.locationIds().isEmpty()) return List.of();
        return repository.trend(at(from), at(to.plusDays(1)), scope.locationIds()).stream()
                .map(row -> new PartnerInsightsResponses.TrendPoint(row.getDate(), number(row.getActiveEmployees()),
                        number(row.getNewEmployees()), number(row.getReturningEmployees()), number(row.getOrders()),
                        money(row.getSpend()))).toList();
    }

    private List<PartnerInsightsResponses.LocationMetric> locationMetrics(Scope scope, LocalDate from, LocalDate to) {
        if (scope.locationIds().isEmpty()) return List.of();
        Map<Long, PartnerInsightsProjections.Location> byId = repository.locations(
                at(from), at(to.plusDays(1)), scope.locationIds()).stream()
                .collect(Collectors.toMap(PartnerInsightsProjections.Location::getLocationId, Function.identity()));
        return scope.links().stream().map(link -> {
            PartnerInsightsProjections.Location row = byId.get(link.getLocation().getId());
            long active = row == null ? 0 : number(row.getActiveEmployees());
            long ordering = row == null ? 0 : number(row.getOrderingEmployees());
            return new PartnerInsightsResponses.LocationMetric(link.getLocation().getId(), link.getLocation().getName(),
                    link.getLocation().getCode(), active, ordering, rate(ordering, active),
                    row == null ? 0 : number(row.getRepeatEmployees()),
                    rate(row == null ? 0 : number(row.getRepeatEmployees()), ordering),
                    row == null ? 0 : number(row.getOrders()),
                    divide(row == null ? BigDecimal.ZERO : money(row.getSpend()), ordering),
                    row == null ? BigDecimal.ZERO : money(row.getSpend()));
        }).toList();
    }

    private PartnerInsightsResponses.Summary toSummary(PartnerInsightsProjections.EmployeeSummary row) {
        long active = number(row.getActiveEmployees());
        long ordering = number(row.getOrderingEmployees());
        long repeat = number(row.getRepeatEmployees());
        long orders = number(row.getCompletedOrders());
        BigDecimal spend = money(row.getSpend());
        return new PartnerInsightsResponses.Summary(active, ordering, rate(ordering, active), repeat,
                rate(repeat, ordering), orders, divide(orders, active), divide(orders, ordering),
                divide(spend, ordering),
                divide(orders, ordering), spend);
    }

    private PartnerInsightsResponses.Comparison comparison(PartnerInsightsProjections.EmployeeSummary current,
                                                            PartnerInsightsProjections.EmployeeSummary previous) {
        return new PartnerInsightsResponses.Comparison(
                percent(current.getOrderingEmployees(), previous.getOrderingEmployees()),
                percent(current.getRepeatEmployees(), previous.getRepeatEmployees()),
                percent(current.getCompletedOrders(), previous.getCompletedOrders()),
                percent(current.getSpend(), previous.getSpend()));
    }

    private LocalDateTime at(LocalDate date) { return date.atStartOfDay(); }
    private long number(Number value) { return value == null ? 0 : value.longValue(); }
    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }
    private BigDecimal divide(long numerator, long denominator) {
        return denominator == 0 ? BigDecimal.ZERO :
                BigDecimal.valueOf(numerator).divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }
    private BigDecimal divide(BigDecimal numerator, long denominator) {
        return denominator == 0 ? BigDecimal.ZERO : money(numerator).divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }
    private BigDecimal rate(long numerator, long denominator) {
        return denominator == 0 ? BigDecimal.ZERO :
                BigDecimal.valueOf(numerator * 100L).divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }
    private BigDecimal share(BigDecimal value, BigDecimal total) {
        return total.signum() == 0 ? BigDecimal.ZERO :
                money(value).multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP);
    }
    private BigDecimal percent(Number current, Number previous) {
        BigDecimal c = BigDecimal.valueOf(number(current)), p = BigDecimal.valueOf(number(previous));
        return p.signum() == 0 ? (c.signum() == 0 ? BigDecimal.ZERO : null) :
                c.subtract(p).multiply(BigDecimal.valueOf(100)).divide(p, 2, RoundingMode.HALF_UP);
    }
    private BigDecimal percent(BigDecimal current, BigDecimal previous) {
        BigDecimal c = money(current), p = money(previous);
        return p.signum() == 0 ? (c.signum() == 0 ? BigDecimal.ZERO : null) :
                c.subtract(p).multiply(BigDecimal.valueOf(100)).divide(p, 2, RoundingMode.HALF_UP);
    }

    private record Scope(List<PartnerLocation> links, List<Long> locationIds) {}
    private static final class EmptySummary implements PartnerInsightsProjections.EmployeeSummary {
        public Long getActiveEmployees() { return 0L; }
        public Long getOrderingEmployees() { return 0L; }
        public Long getRepeatEmployees() { return 0L; }
        public Long getCompletedOrders() { return 0L; }
        public BigDecimal getSpend() { return BigDecimal.ZERO; }
    }
}
