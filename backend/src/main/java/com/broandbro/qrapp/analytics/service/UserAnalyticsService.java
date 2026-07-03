package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.RepeatCustomerResponse;
import com.broandbro.qrapp.analytics.dto.UserAggregateStatsResponse;
import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface UserAnalyticsService {
    Optional<UserPreferenceResponse> getUserPreference(Long userId);
    Page<UserPreferenceResponse> getUsersBySegment(String segment, Pageable pageable);
    Page<UserPreferenceResponse> getChurnedUsers(Pageable pageable);
    Page<UserPreferenceResponse> getTopSpenders(Pageable pageable);
    double getRepeatCustomerRate();

    /** Aggregate stats for the dashboard overview panel (no userId required). */
    UserAggregateStatsResponse getAggregateStats();

    /** Top N most active users for the Most Active Users table. */
    List<RepeatCustomerResponse> getMostActiveUsers(int limit);
}

