package com.broandbro.qrapp.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Summary of pre-order activity for the admin dashboard.
 */
@Data
public class AdminPreOrderDashboardResponse {

    /** Total pre-orders that have not been cancelled */
    private long totalPreOrders;

    /** Pre-orders scheduled for today */
    private long todayPreOrders;

    /** Pre-orders scheduled for tomorrow */
    private long tomorrowPreOrders;

    /** Pre-orders that are upcoming (future, not yet accepted) */
    private long pendingPreOrders;

    /** Pre-orders that were accepted and moved to live flow */
    private long acceptedPreOrders;

    /** Pre-orders that are overdue (scheduled time passed but still PRE_ORDERED) */
    private long overduePreOrders;

    /** Pre-orders cancelled */
    private long cancelledPreOrders;

    /** Next upcoming pre-orders (by scheduled time) */
    private List<AdminOrderResponse> upcomingQueue = new ArrayList<>();
}

