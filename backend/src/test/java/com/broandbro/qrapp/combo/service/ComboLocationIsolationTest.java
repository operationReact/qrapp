package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.ComboCreateRequest;
import com.broandbro.qrapp.combo.dto.ComboItemRequest;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.ComboType;
import com.broandbro.qrapp.enums.TimeSlot;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ComboLocationIsolationTest {

    private final Location mindspace = Location.builder().id(1L).name("Mindspace").build();
    @Test
    void mixedLocationItemsAreRejectedBeforeComboIsSaved() {
        MenuRepository menus = mock(MenuRepository.class);
        var combos = mock(com.broandbro.qrapp.combo.repository.ComboRepository.class);
        MenuItem first = item(10L, mindspace);
        when(menus.findLocationIdById(10L)).thenReturn(Optional.of(1L));
        when(menus.findByIdAndLocationId(10L, 1L)).thenReturn(Optional.of(first));
        when(menus.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.empty());

        ComboServiceImpl service = service(menus, combos);

        assertThatThrownBy(() -> service.createCombo(request(10L, 20L), "admin", 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Menu item not found");
        verifyNoInteractions(combos);
    }

    @Test
    void sameLocationItemsCanCreateCombo() {
        MenuRepository menus = mock(MenuRepository.class);
        var combos = mock(com.broandbro.qrapp.combo.repository.ComboRepository.class);
        MenuItem first = item(10L, mindspace);
        MenuItem second = item(20L, mindspace);
        when(menus.findLocationIdById(10L)).thenReturn(Optional.of(1L));
        when(menus.findByIdAndLocationId(10L, 1L)).thenReturn(Optional.of(first));
        when(menus.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.of(second));
        var pricing = mock(com.broandbro.qrapp.service.PricingService.class);
        when(pricing.getCurrentSellingPrice(anyLong())).thenReturn(BigDecimal.TEN);
        when(combos.save(any( com.broandbro.qrapp.combo.entity.Combo.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ComboServiceImpl service = new ComboServiceImpl(
                combos, mock(com.broandbro.qrapp.combo.repository.ComboAnalyticsDailyRepository.class),
                mock(CategoryRepository.class), menus, mock(SignatureProductRepository.class),
                mock(ComboPricingService.class), mock(ComboAvailabilityService.class), pricing);

        service.createCombo(request(10L, 20L), "admin", 1L);

        verify(combos).save(any(com.broandbro.qrapp.combo.entity.Combo.class));
    }

    private ComboServiceImpl service(MenuRepository menus,
                                     com.broandbro.qrapp.combo.repository.ComboRepository combos) {
        return new ComboServiceImpl(
                combos,
                mock(com.broandbro.qrapp.combo.repository.ComboAnalyticsDailyRepository.class),
                mock(CategoryRepository.class), menus,
                mock(SignatureProductRepository.class),
                mock(ComboPricingService.class), mock(ComboAvailabilityService.class),
                mock(com.broandbro.qrapp.service.PricingService.class));
    }

    private static ComboCreateRequest request(Long first, Long second) {
        return new ComboCreateRequest("Combo", "Combo", null, null, ComboType.MIXED,
                BigDecimal.ONE, null, TimeSlot.FULL_DAY, false, false, false, 0,
                List.of(new ComboItemRequest(first, 1, 0), new ComboItemRequest(second, 1, 1)),
                null, null);
    }

    private static MenuItem item(Long id, Location location) {
        MenuItem item = new MenuItem();
        item.setId(id);
        item.setName("Item " + id);
        item.setLocation(location);
        item.setIsHidden(false);
        return item;
    }
}
