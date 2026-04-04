package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Wallet;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WalletRepository;
import com.broandbro.qrapp.repository.WalletTransactionRepository;
import com.broandbro.qrapp.service.RazorpayService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WalletApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private WalletTransactionRepository walletTransactionRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private RazorpayService razorpayService;

    @BeforeEach
    void setUp() {
        walletTransactionRepository.deleteAll();
        walletRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        menuRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void authenticatedUserCanTopUpWalletAndReadOverview() throws Exception {
        User user = userRepository.save(User.builder()
                .phone("9000000030")
                .name("Wallet User")
                .password(passwordEncoder.encode("Password@123"))
                .token("token-wallet-topup")
                .build());
        walletRepository.save(Wallet.builder().user(user).balance(1000L).build());

        when(razorpayService.createOrder(anyLong(), anyString(), anyString())).thenReturn("order_wallet_123");
        when(razorpayService.getKeyId()).thenReturn("rzp_test_123");
        when(razorpayService.verifySignature("order_wallet_123", "pay_wallet_123", "sig_wallet_123")).thenReturn(true);

        mockMvc.perform(post("/api/wallet/create-order")
                        .header("Authorization", "Bearer token-wallet-topup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("amount", 5000))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.razorpayOrderId").value("order_wallet_123"))
                .andExpect(jsonPath("$.keyId").value("rzp_test_123"));

        mockMvc.perform(post("/api/wallet/verify-payment")
                        .header("Authorization", "Bearer token-wallet-topup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "razorpayOrderId", "order_wallet_123",
                                "razorpayPaymentId", "pay_wallet_123",
                                "razorpaySignature", "sig_wallet_123"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/wallet/overview")
                        .header("Authorization", "Bearer token-wallet-topup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(6000))
                .andExpect(jsonPath("$.totalCredited").value(5000))
                .andExpect(jsonPath("$.totalDebited").value(0))
                .andExpect(jsonPath("$.successfulCreditsCount").value(1));

        mockMvc.perform(get("/api/wallet/transactions")
                        .header("Authorization", "Bearer token-wallet-topup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("CREDIT"))
                .andExpect(jsonPath("$.content[0].status").value("SUCCESS"))
                .andExpect(jsonPath("$.content[0].description").value("Wallet top-up successful"))
                .andExpect(jsonPath("$.content[0].balanceAfter").value(6000));

        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(6000L);
    }

    @Test
    void authenticatedUserCanCheckoutUsingWallet() throws Exception {
        User user = userRepository.save(User.builder()
                .phone("9000000040")
                .name("Checkout User")
                .password(passwordEncoder.encode("Password@123"))
                .token("token-wallet-checkout")
                .build());
        walletRepository.save(Wallet.builder().user(user).balance(100000L).build());

        MenuItem item = new MenuItem();
        item.setName("Paneer Wrap");
        item.setPrice(120);
        item.setCategory("Lunch");
        item.setAvailable(true);
        item.setRecommended(true);
        item = menuRepository.save(item);

        mockMvc.perform(post("/orders")
                        .header("Authorization", "Bearer token-wallet-checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", user.getPhone(),
                                "paymentMethod", "WALLET",
                                "items", java.util.List.of(Map.of("itemId", item.getId(), "quantity", 2))
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentMethod").value("WALLET"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.amount").value(24000));

        Order order = orderRepository.findAll().stream().findFirst().orElseThrow();
        assertThat(order.getPaymentStatus()).isEqualTo("PAID");
        assertThat(order.getPaymentMethod()).isEqualTo(PaymentMethod.WALLET);
        assertThat(walletRepository.findByUserId(user.getId()).orElseThrow().getBalance()).isEqualTo(76000L);
        assertThat(walletTransactionRepository.findAll()).hasSize(1);
        assertThat(walletTransactionRepository.findAll().get(0).getOrderId()).isEqualTo(order.getId());
    }
}

