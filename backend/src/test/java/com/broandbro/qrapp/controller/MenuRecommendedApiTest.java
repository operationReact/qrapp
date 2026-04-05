package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.MenuRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MenuRecommendedApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        menuRepository.deleteAll();
    }

    @Test
    void getRecommendedMenu_returnsOnlyAvailableRecommendedItemsAndRespectsLimit() throws Exception {
        MenuItem r1 = new MenuItem();
        r1.setName("Rec 1");
        r1.setPrice(100);
        r1.setCategory("Test");
        r1.setAvailable(true);
        r1.setRecommended(true);
        menuRepository.save(r1);

        MenuItem r2 = new MenuItem();
        r2.setName("Rec 2");
        r2.setPrice(120);
        r2.setCategory("Test");
        r2.setAvailable(true);
        r2.setRecommended(true);
        menuRepository.save(r2);

        MenuItem r3 = new MenuItem();
        r3.setName("Rec Hidden");
        r3.setPrice(140);
        r3.setCategory("Test");
        r3.setAvailable(false);
        r3.setRecommended(true);
        menuRepository.save(r3);

        MenuItem regular = new MenuItem();
        regular.setName("Regular");
        regular.setPrice(90);
        regular.setCategory("Test");
        regular.setAvailable(true);
        regular.setRecommended(false);
        menuRepository.save(regular);

        mockMvc.perform(get("/menu/recommended").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].recommended").value(true))
                .andExpect(jsonPath("$[0].available").value(true));
    }

    @Test
    void adminCanUpdateRecommendedFlagViaMenuUpdateApi() throws Exception {
        MenuItem item = new MenuItem();
        item.setName("Toggle Me");
        item.setPrice(110);
        item.setCategory("Test");
        item.setAvailable(true);
        item.setRecommended(false);
        item = menuRepository.save(item);

        String body = objectMapper.writeValueAsString(Map.of("recommended", true));

        mockMvc.perform(put("/menu/{id}", item.getId())
                        .with(httpBasic("admin", "123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(item.getId()))
                .andExpect(jsonPath("$.recommended").value(true));

        mockMvc.perform(get("/menu/recommended"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(item.getId()));
    }
}

