package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.PricingService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class PricingLocationIsolationTest {

    @Test
    void sameLocationPricingMutationIsAccepted() {
        MenuRepository menus = mock(MenuRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(1L)).thenReturn(Optional.of(activeLocation(1L)));
        when(menus.findByIdAndLocationId(10L, 1L))
                .thenReturn(Optional.of(new com.broandbro.qrapp.entity.MenuItem()));
        PricingService pricing = mock(PricingService.class);
        PricingController controller = controller(pricing, menus, locations);

        controller.setSellingPrice(
                new PriceSetRequest(10L, BigDecimal.TEN, null, "test"),
                1L, principal());

        verify(pricing).setSellingPrice(any());
    }

    @Test
    void crossLocationPricingMutationIsRejected() {
        MenuRepository menus = mock(MenuRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(1L)).thenReturn(Optional.of(activeLocation(1L)));
        when(menus.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.empty());
        PricingController controller = controller(
                mock(PricingService.class), menus, locations);

        assertThatThrownBy(() -> controller.setSellingPrice(
                new PriceSetRequest(20L, BigDecimal.TEN, null, "test"),
                1L, principal()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("menu_item_location_mismatch");
    }

    private static PricingController controller(PricingService pricing,
                                                 MenuRepository menus,
                                                 LocationRepository locations) {
        UserService users = mock(UserService.class);
        when(users.findByPhone("admin")).thenReturn(Optional.of(User.builder().build()));
        return new PricingController(pricing, menus, locations,
                mock(LocationAccessService.class), users);
    }

    private static Location activeLocation(Long id) {
        return Location.builder().id(id).name("Location " + id)
                .code("LOCATION_" + id).active(true).build();
    }

    private static Principal principal() {
        return () -> "admin";
    }
}
