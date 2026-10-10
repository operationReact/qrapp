package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.service.PartnerAccessService;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/partner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerBusinessController {
    private final PartnerAccessService access;
    private final MenuRepository menuRepository;
    private final PricingService pricingService;
    private final OrderRepository orderRepository;

    @GetMapping("/locations/{locationId}/menu")
    public List<PartnerMenuItemResponse> menu(@PathVariable Long locationId,
                                              org.springframework.security.core.Authentication authentication) {
        access.accessibleLocation(locationId, authentication);
        return menuRepository.findByLocationIdAndIsDeletedFalse(locationId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getIsHidden()))
                .map(this::menuResponse).toList();
    }

    @GetMapping("/orders")
    public Page<PartnerOrderResponse> orders(@RequestParam(required = false) Long locationId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size,
                                             org.springframework.security.core.Authentication authentication) {
        PageRequest request = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<com.broandbro.qrapp.entity.Order> result;
        if (locationId != null) {
            access.accessibleLocation(locationId, authentication);
            result = orderRepository.findByLocationId(locationId, request);
        } else {
            List<Long> locations = access.accessibleLocations(authentication).stream()
                    .map(link -> link.getLocation().getId()).toList();
            result = locations.isEmpty() ? Page.empty(request) : orderRepository.findByLocationIdIn(locations, request);
        }
        return result.map(PartnerOrderResponse::from);
    }

    @GetMapping("/orders/{orderId}")
    public PartnerOrderResponse order(@PathVariable Long orderId,
                                      org.springframework.security.core.Authentication authentication) {
        return PartnerOrderResponse.from(access.requireOrderAccess(orderId, authentication));
    }

    private PartnerMenuItemResponse menuResponse(com.broandbro.qrapp.entity.MenuItem item) {
        return new PartnerMenuItemResponse(item.getId(), item.getCategory() == null ? null : item.getCategory().getName(),
                item.getName(), item.getDescription(), pricingService.getCurrentSellingPrice(item.getId()),
                item.getAvailable(), !Boolean.TRUE.equals(item.getIsHidden()), item.getIsVeg(), item.getImageUrl());
    }

}
