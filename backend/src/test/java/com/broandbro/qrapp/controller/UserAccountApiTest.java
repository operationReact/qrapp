package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAccountApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        menuRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void authenticatedUserCanFetchOwnOrders() throws Exception {
        User user = User.builder()
                .phone("9000000010")
                .name("Aarav")
                .password(passwordEncoder.encode("Password@123"))
                .token("token-orders")
                .build();
        user = userRepository.save(user);

        MenuItem item = new MenuItem();
        item.setName("Healthy Oat Meal");
        item.setPrice(99);
        item.setCategory("Breakfast");
        item.setAvailable(true);
        item.setRecommended(true);
        item = menuRepository.save(item);

        Order order = new Order();
        order.setUserId(user.getId());
        order.setPhone(user.getPhone());
        order.setStatus(OrderStatus.READY);
        order.setPaymentStatus("PAID");
        order.setCreatedAt(LocalDateTime.now().minusHours(1));
        order = orderRepository.save(order);

        OrderItem orderItem = new OrderItem();
        orderItem.setOrderId(order.getId());
        orderItem.setItemId(item.getId());
        orderItem.setQuantity(2);
        orderItemRepository.save(orderItem);

        mockMvc.perform(get("/orders/me")
                        .header("Authorization", "Bearer token-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(order.getId()))
                .andExpect(jsonPath("$[0].status").value("READY"))
                .andExpect(jsonPath("$[0].paymentStatus").value("PAID"))
                .andExpect(jsonPath("$[0].total").value(198.0))
                .andExpect(jsonPath("$[0].items.length()").value(1))
                .andExpect(jsonPath("$[0].items[0].name").value("Healthy Oat Meal"))
                .andExpect(jsonPath("$[0].items[0].quantity").value(2));
    }

    @Test
    void authenticatedUserCanUpdateProfileAndPassword() throws Exception {
        User user = User.builder()
                .phone("9000000020")
                .name("Old Name")
                .password(passwordEncoder.encode("Password@123"))
                .token("token-profile")
                .build();
        userRepository.save(user);

        String body = objectMapper.writeValueAsString(Map.of(
                "name", "New Name",
                "phone", "9000000099",
                "currentPassword", "Password@123",
                "newPassword", "Password@456"
        ));

        mockMvc.perform(put("/auth/me")
                        .header("Authorization", "Bearer token-profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Name"))
                .andExpect(jsonPath("$.phone").value("9000000099"));

        User updated = userRepository.findByPhone("9000000099").orElseThrow();
        assertThat(updated.getName()).isEqualTo("New Name");
        assertThat(passwordEncoder.matches("Password@456", updated.getPassword())).isTrue();
        assertThat(userRepository.findByPhone("9000000020")).isEmpty();
    }
}

