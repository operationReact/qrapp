package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.RepeatCustomerResponse;
import com.broandbro.qrapp.analytics.dto.UserAggregateStatsResponse;
import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface UserAnalyticsService {
    /**
     * Customer-level preference snapshots are lifetime/global user metrics and are
     * not split by location; the scope is used only to enforce visibility.
     */
    Optional<UserPreferenceResponse> getUserPreference(Long userId, AnalyticsLocationScope scope);

    /**
     * Customer segmentation is global regardless of selected location; the scope
     * is used only to enforce visibility.
     */
    Page<UserPreferenceResponse> getUsersBySegment(String segment, AnalyticsLocationScope scope, Pageable pageable);

    /** Customer churn is global regardless of selected location; scope enforces visibility only. */
    Page<UserPreferenceResponse> getChurnedUsers(AnalyticsLocationScope scope, Pageable pageable);

    /** Lifetime spend leaderboards are global regardless of selected location; scope enforces visibility only. */
    Page<UserPreferenceResponse> getTopSpenders(AnalyticsLocationScope scope, Pageable pageable);

    /** Repeat-customer rate is global regardless of selected location; scope enforces visibility only. */
    double getRepeatCustomerRate(AnalyticsLocationScope scope);

    /**
     * Aggregate stats mix global customer-level counts with location-aware live-order
     * favourite-item/time-slot lists; invisible scopes return zero/empty data.
     */
    UserAggregateStatsResponse getAggregateStats(AnalyticsLocationScope scope);

    /** Top N most active users for the Most Active Users table. */
    List<RepeatCustomerResponse> getMostActiveUsers(int limit, AnalyticsLocationScope scope);
}
