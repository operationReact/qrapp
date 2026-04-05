package com.broandbro.qrapp.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AdminOrderDashboardResponse {
	private long totalOrders;
	private long liveOrders;
	private long placedOrders;
	private long preparingOrders;
	private long readyOrders;
	private long completedToday;
	private long delayedOrders;
	private long paidOrders;
	private double averageFulfillmentMinutes;
	private List<AdminOrderResponse> liveOrdersQueue = new ArrayList<>();
	private List<AdminOrderResponse> attentionOrders = new ArrayList<>();
}

