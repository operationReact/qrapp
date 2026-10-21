package com.broandbro.qrapp.addon.controller;

import com.broandbro.qrapp.addon.dto.AddonDtos.ItemAddonGroupResponse;
import com.broandbro.qrapp.addon.service.AddonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public, read-only add-ons for a menu item (no login required, same as {@code /menu}).
 *
 * <pre>
 * GET /api/menu/items/{itemId}/addons?locationId=
 * </pre>
 */
@RestController
@RequestMapping("/api/menu/items")
@RequiredArgsConstructor
public class AddonPublicController {

    private final AddonService addonService;

    @GetMapping("/{itemId}/addons")
    public List<ItemAddonGroupResponse> getAddons(@PathVariable Long itemId,
                                                  @RequestParam Long locationId) {
        return addonService.getItemAddons(locationId, itemId);
    }

    @GetMapping("/with-addons")
    public List<Long> getItemIdsWithAddons(@RequestParam Long locationId) {
        return addonService.listItemIdsWithAddons(locationId);
    }
}
