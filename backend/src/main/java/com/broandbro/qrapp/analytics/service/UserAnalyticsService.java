package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface UserAnalyticsService {
    Optional<UserPreferenceResponse> getUserPreference(Long userId);
    Page<UserPreferenceResponse> getUsersBySegment(String segment, Pageable pageable);
    Page<UserPreferenceResponse> getChurnedUsers(Pageable pageable);
    Page<UserPreferenceResponse> getTopSpenders(Pageable pageable);
    double getRepeatCustomerRate();
}

