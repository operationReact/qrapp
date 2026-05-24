package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface MenuAnalyticsService {
    List<TopMenuItemResponse> getTopItemsByRevenue(LocalDate from, LocalDate to, int limit);
    List<TopMenuItemResponse> getTopItemsByQty(LocalDate from, LocalDate to, int limit);
    List<TopMenuItemResponse> getCategoryRevenueRollup(LocalDate from, LocalDate to);
    Page<TopMenuItemResponse> getTopItemsPaged(LocalDate from, LocalDate to, String sortBy, Pageable pageable);
}

