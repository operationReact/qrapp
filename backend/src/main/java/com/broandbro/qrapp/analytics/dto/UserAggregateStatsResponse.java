package com.broandbro.qrapp.analytics.dto;

import java.util.List;

/**
 * Aggregate user analytics stats for the dashboard overview panel.
 *
 * @param totalUsers            total distinct users with any order
 * @param repeatCustomers       users with more than one completed order
 * @param avgOrdersPerUser      average completed orders per user
 * @param favoriteItems         top items ordered across all users [{name, count}]
 * @param orderTimeDistribution order counts grouped by time-of-day slot [{slot, count}]
 */
public record UserAggregateStatsResponse(
        long totalUsers,
        long repeatCustomers,
        double avgOrdersPerUser,
        List<FavoriteItemEntry> favoriteItems,
        List<OrderTimeSlot> orderTimeDistribution
) {
    public record FavoriteItemEntry(String name, long count) {}
    public record OrderTimeSlot(String slot, long count) {}
}

