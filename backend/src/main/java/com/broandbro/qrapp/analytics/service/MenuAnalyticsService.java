package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface MenuAnalyticsService {
    List<TopMenuItemResponse> getTopItemsByRevenue(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);
    List<TopMenuItemResponse> getLeastSellingItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);
    List<TopMenuItemResponse> getTopItemsByQty(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);
    List<TopMenuItemResponse> getCategoryRevenueRollup(LocalDate from, LocalDate to, AnalyticsLocationScope scope);
    Page<TopMenuItemResponse> getTopItemsPaged(LocalDate from, LocalDate to, String sortBy, AnalyticsLocationScope scope, Pageable pageable);

    /** Top N items ranked by estimated profit (revenue - cost). */
    List<TopMenuItemResponse> getTopItemsByProfit(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);

    /** Top N items ranked by profit margin % (highest margin first). */
    List<TopMenuItemResponse> getHighestMarginItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);
}
