package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.OrderStatusHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminOrderApiTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private OrderRepository orderRepository;

	@Autowired
	private OrderItemRepository orderItemRepository;

	@Autowired
	private MenuRepository menuRepository;

	@Autowired
	private OrderStatusHistoryRepository orderStatusHistoryRepository;

	@BeforeEach
	void setUp() {
		orderStatusHistoryRepository.deleteAll();
		orderItemRepository.deleteAll();
		orderRepository.deleteAll();
		menuRepository.deleteAll();
	}

	@Test
	void adminDashboardShowsLiveOrdersAndFiltersWork() throws Exception {
		MenuItem dosa = menuRepository.save(menu("Masala Dosa", 95.0, true));
		MenuItem coffee = menuRepository.save(menu("Filter Coffee", 40.0, true));

		Order placed = order("9000000101", OrderStatus.PLACED, "PAID", LocalDateTime.now().minusMinutes(25));
		placed.setLastStatusChangedAt(LocalDateTime.now().minusMinutes(8));
		placed.setPriority(OrderPriority.HIGH);
		placed.setAdminNote("VIP customer");
		placed = orderRepository.save(placed);
		orderItemRepository.save(item(placed.getId(), dosa.getId(), 2));

		Order ready = order("9000000102", OrderStatus.READY, "PAID", LocalDateTime.now().minusMinutes(35));
		ready.setLastStatusChangedAt(LocalDateTime.now().minusMinutes(12));
		ready.setPriority(OrderPriority.URGENT);
		ready = orderRepository.save(ready);
		orderItemRepository.save(item(ready.getId(), coffee.getId(), 1));

		Order completed = order("9000000103", OrderStatus.COMPLETED, "PAID", LocalDateTime.now().minusHours(2));
		completed.setCompletedAt(LocalDateTime.now().minusMinutes(5));
		orderRepository.save(completed);

		String dashboardJson = mockMvc.perform(get("/admin/orders/dashboard")
						.with(httpBasic("admin", "123")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.liveOrders").value(2))
				.andExpect(jsonPath("$.delayedOrders").value(2))
				.andExpect(jsonPath("$.paidOrders").value(3))
				.andReturn()
				.getResponse()
				.getContentAsString();

		JsonNode dashboard = objectMapper.readTree(dashboardJson);
		assertThat(dashboard.path("liveOrdersQueue")).hasSize(2);
		assertThat(dashboard.path("liveOrdersQueue").toString()).contains("Masala Dosa", "Filter Coffee");

		mockMvc.perform(get("/admin/orders")
						.with(httpBasic("admin", "123"))
						.param("liveOnly", "true")
						.param("priority", "HIGH"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(1))
				.andExpect(jsonPath("$.content[0].phone").value("9000000101"))
				.andExpect(jsonPath("$.content[0].adminNote").value("VIP customer"))
				.andExpect(jsonPath("$.content[0].items[0].name").value("Masala Dosa"));
	}

	@Test
	void adminCanMoveOrderThroughStagesWithPriorityAndNotes() throws Exception {
		Order order = orderRepository.save(order("9000000201", OrderStatus.PLACED, "PENDING", LocalDateTime.now().minusMinutes(6)));

		mockMvc.perform(patch("/admin/orders/{id}", order.getId())
						.with(httpBasic("admin", "123"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"status", "PREPARING",
								"priority", "URGENT",
								"adminNote", "Kitchen started immediately"
						))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PREPARING"))
				.andExpect(jsonPath("$.priority").value("URGENT"))
				.andExpect(jsonPath("$.assignedAdmin").value("admin"))
				.andExpect(jsonPath("$.history[0].newStatus").value("PREPARING"))
				.andExpect(jsonPath("$.history[0].changedBy").value("admin"));

		Order updated = orderRepository.findById(order.getId()).orElseThrow();
		assertThat(updated.getStatus()).isEqualTo(OrderStatus.PREPARING);
		assertThat(updated.getPriority()).isEqualTo(OrderPriority.URGENT);
		assertThat(updated.getAdminNote()).isEqualTo("Kitchen started immediately");
		assertThat(updated.getAssignedAdmin()).isEqualTo("admin");
		assertThat(orderStatusHistoryRepository.findAll()).hasSize(1);
	}

	@Test
	void completedOrderCannotBeMovedBackwards() throws Exception {
		Order completed = order("9000000301", OrderStatus.COMPLETED, "PAID", LocalDateTime.now().minusHours(1));
		completed.setCompletedAt(LocalDateTime.now().minusMinutes(1));
		completed = orderRepository.save(completed);

		mockMvc.perform(patch("/admin/orders/{id}", completed.getId())
						.with(httpBasic("admin", "123"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("status", "PREPARING"))))
				.andExpect(status().isBadRequest())
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.contains("Cannot move order from COMPLETED to PREPARING"));
	}

	private MenuItem menu(String name, double price, boolean recommended) {
		MenuItem menuItem = new MenuItem();
		menuItem.setName(name);
		menuItem.setPrice(price);
		menuItem.setCategory("Admin Test");
		menuItem.setAvailable(true);
		menuItem.setRecommended(recommended);
		return menuItem;
	}

	private Order order(String phone, OrderStatus status, String paymentStatus, LocalDateTime createdAt) {
		Order order = new Order();
		order.setPhone(phone);
		order.setStatus(status);
		order.setPaymentStatus(paymentStatus);
		order.setPaymentMethod(PaymentMethod.RAZORPAY);
		order.setCreatedAt(createdAt);
		order.setLastStatusChangedAt(createdAt);
		order.setPriority(OrderPriority.NORMAL);
		return order;
	}

	private OrderItem item(Long orderId, Long itemId, int quantity) {
		OrderItem orderItem = new OrderItem();
		orderItem.setOrderId(orderId);
		orderItem.setItemId(itemId);
		orderItem.setQuantity(quantity);
		return orderItem;
	}
}

