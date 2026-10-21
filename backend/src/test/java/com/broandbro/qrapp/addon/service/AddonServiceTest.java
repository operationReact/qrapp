package com.broandbro.qrapp.addon.service;

import com.broandbro.qrapp.addon.dto.AddonDtos.GroupRequest;
import com.broandbro.qrapp.addon.dto.AddonDtos.ItemAddonGroupResponse;
import com.broandbro.qrapp.addon.entity.AddonGroup;
import com.broandbro.qrapp.addon.entity.AddonOption;
import com.broandbro.qrapp.addon.entity.MenuItemAddonGroup;
import com.broandbro.qrapp.addon.repository.AddonGroupRepository;
import com.broandbro.qrapp.addon.repository.MenuItemAddonGroupRepository;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AddonServiceTest {

    private final AddonGroupRepository groupRepository = mock(AddonGroupRepository.class);
    private final MenuItemAddonGroupRepository linkRepository = mock(MenuItemAddonGroupRepository.class);
    private final MenuRepository menuRepository = mock(MenuRepository.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);

    private final AddonService service = new AddonService(
            groupRepository, linkRepository, menuRepository, locationRepository);

    @Test
    void createGroupRejectsMinGreaterThanMax() {
        when(locationRepository.findById(1L)).thenReturn(Optional.of(new Location()));

        GroupRequest req = new GroupRequest();
        req.setName("Toppings");
        req.setMinSelect(3);
        req.setMaxSelect(2);

        assertThrows(IllegalArgumentException.class, () -> service.createGroup(1L, req));
        verify(groupRepository, never()).save(any());
    }

    @Test
    void getItemAddonsHidesInactiveGroupsAndOptions() {
        AddonOption active = AddonOption.builder().name("Cheese").priceDelta(new BigDecimal("20.00"))
                .active(true).build();
        AddonOption inactive = AddonOption.builder().name("Old").priceDelta(BigDecimal.ONE)
                .active(false).build();

        AddonGroup visible = AddonGroup.builder().id(10L).name("Extras").minSelect(0).maxSelect(2)
                .active(true).options(new ArrayList<>(List.of(active, inactive))).build();
        AddonGroup hidden = AddonGroup.builder().id(11L).name("Retired").minSelect(0).maxSelect(1)
                .active(false).build();

        MenuItemAddonGroup visibleLink = MenuItemAddonGroup.builder().addonGroup(visible).displayOrder(1).build();
        MenuItemAddonGroup hiddenLink = MenuItemAddonGroup.builder().addonGroup(hidden).displayOrder(2).build();

        when(linkRepository.findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(5L, 1L))
                .thenReturn(List.of(visibleLink, hiddenLink));

        List<ItemAddonGroupResponse> result = service.getItemAddons(1L, 5L);

        assertEquals(1, result.size());
        assertEquals("Extras", result.get(0).getName());
        assertEquals(1, result.get(0).getOptions().size());
        assertEquals("Cheese", result.get(0).getOptions().get(0).getName());
    }

    private AddonGroup radioGroup(long id) {
        AddonGroup group = AddonGroup.builder().id(id).name("Size").minSelect(1).maxSelect(1)
                .active(true).options(new ArrayList<>()).build();
        group.getOptions().add(AddonOption.builder().id(100L).group(group).name("Large")
                .priceDelta(new BigDecimal("20.00")).active(true).build());
        group.getOptions().add(AddonOption.builder().id(101L).group(group).name("Regular")
                .priceDelta(BigDecimal.ZERO).active(true).build());
        return group;
    }

    private AddonGroup extrasGroup(long id) {
        AddonGroup group = AddonGroup.builder().id(id).name("Extras").minSelect(0).maxSelect(2)
                .active(true).options(new ArrayList<>()).build();
        group.getOptions().add(AddonOption.builder().id(200L).group(group).name("Cheese")
                .priceDelta(new BigDecimal("15.00")).active(true).build());
        return group;
    }

    private void linkItemGroups(AddonGroup... groups) {
        List<MenuItemAddonGroup> links = new ArrayList<>();
        for (AddonGroup group : groups) {
            links.add(MenuItemAddonGroup.builder().addonGroup(group).displayOrder(1).build());
        }
        when(linkRepository.findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(5L, 1L))
                .thenReturn(links);
    }

    @Test
    void resolveSelectionRejectsUnknownOption() {
        linkItemGroups(radioGroup(10L));

        assertThrows(IllegalArgumentException.class,
                () -> service.resolveSelection(1L, 5L, List.of(999L)));
    }

    @Test
    void resolveSelectionRejectsMissingRequiredGroup() {
        linkItemGroups(radioGroup(10L), extrasGroup(11L));

        assertThrows(IllegalArgumentException.class,
                () -> service.resolveSelection(1L, 5L, List.of(200L)));
    }

    @Test
    void resolveSelectionRejectsTooManyInRadioGroup() {
        linkItemGroups(radioGroup(10L));

        assertThrows(IllegalArgumentException.class,
                () -> service.resolveSelection(1L, 5L, List.of(100L, 101L)));
    }

    @Test
    void resolveSelectionReturnsSummedDelta() {
        linkItemGroups(radioGroup(10L), extrasGroup(11L));

        AddonService.AddonSelection selection = service.resolveSelection(1L, 5L, List.of(100L, 200L));

        assertEquals(0, new BigDecimal("35.00").compareTo(selection.unitDelta()));
        assertEquals(2, selection.options().size());
    }
}
