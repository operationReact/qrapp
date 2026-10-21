package com.broandbro.qrapp.addon.service;

import com.broandbro.qrapp.addon.dto.AddonDtos.*;
import com.broandbro.qrapp.addon.entity.AddonGroup;
import com.broandbro.qrapp.addon.entity.AddonOption;
import com.broandbro.qrapp.addon.entity.MenuItemAddonGroup;
import com.broandbro.qrapp.addon.repository.AddonGroupRepository;
import com.broandbro.qrapp.addon.repository.MenuItemAddonGroupRepository;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Manages add-on option groups and their attachment to menu items.
 *
 * <p>Every operation is scoped to a location. Lookups go through location-aware
 * repository methods so an ID from another location resolves to "not found".
 */
@Service
@RequiredArgsConstructor
public class AddonService {

    private final AddonGroupRepository groupRepository;
    private final MenuItemAddonGroupRepository linkRepository;
    private final MenuRepository menuRepository;
    private final LocationRepository locationRepository;

    // ── Admin: groups ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GroupResponse> listGroups(Long locationId) {
        return groupRepository.findByLocationIdOrderByDisplayOrderAscIdAsc(locationId).stream()
                .map(this::toGroupResponse)
                .toList();
    }

    @Transactional
    public GroupResponse createGroup(Long locationId, GroupRequest req) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new NoSuchElementException("location not found"));
        validateSelection(req.getMinSelect(), req.getMaxSelect());

        AddonGroup group = AddonGroup.builder().location(location).build();
        applyGroup(group, req);
        return toGroupResponse(groupRepository.save(group));
    }

    /** Updates a group. When {@code options} is supplied, the option list is replaced as a whole. */
    @Transactional
    public GroupResponse updateGroup(Long locationId, Long groupId, GroupRequest req) {
        AddonGroup group = requireGroup(locationId, groupId);
        validateSelection(req.getMinSelect(), req.getMaxSelect());
        applyGroup(group, req);
        return toGroupResponse(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(Long locationId, Long groupId) {
        groupRepository.delete(requireGroup(locationId, groupId));
    }

    // ── Admin: item attachment ────────────────────────────────────────────────

    @Transactional
    public void attachGroup(Long locationId, Long itemId, AttachRequest req) {
        MenuItem item = menuRepository.findByIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new NoSuchElementException("menu item not found"));
        AddonGroup group = requireGroup(locationId, req.getAddonGroupId());
        if (linkRepository.findByMenuItemIdAndAddonGroupId(itemId, group.getId()).isPresent()) {
            throw new IllegalStateException("addon group already attached to this item");
        }
        linkRepository.save(MenuItemAddonGroup.builder()
                .menuItem(item)
                .addonGroup(group)
                .displayOrder(req.getDisplayOrder() == null ? 0 : req.getDisplayOrder())
                .build());
    }

    @Transactional(readOnly = true)
    public List<Long> listAttachedGroupIds(Long locationId, Long itemId) {
        return linkRepository
                .findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(itemId, locationId)
                .stream()
                .map(link -> link.getAddonGroup().getId())
                .toList();
    }

    @Transactional
    public void detachGroup(Long locationId, Long itemId, Long groupId) {
        AddonGroup group = requireGroup(locationId, groupId);
        MenuItemAddonGroup link = linkRepository.findByMenuItemIdAndAddonGroupId(itemId, group.getId())
                .orElseThrow(() -> new NoSuchElementException("addon group not attached to this item"));
        linkRepository.delete(link);
    }

    // ── Public: customer-facing add-ons for one item ──────────────────────────

    /**
     * Returns active groups (with active options) attached to the item, in display order.
     * Returns an empty list when the item does not belong to the location.
     */
    @Transactional(readOnly = true)
    public List<ItemAddonGroupResponse> getItemAddons(Long locationId, Long itemId) {
        return linkRepository
                .findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(itemId, locationId)
                .stream()
                .filter(link -> Boolean.TRUE.equals(link.getAddonGroup().getActive()))
                .map(link -> ItemAddonGroupResponse.builder()
                        .id(link.getAddonGroup().getId())
                        .name(link.getAddonGroup().getName())
                        .minSelect(link.getAddonGroup().getMinSelect())
                        .maxSelect(link.getAddonGroup().getMaxSelect())
                        .displayOrder(link.getDisplayOrder())
                        .options(link.getAddonGroup().getOptions().stream()
                                .filter(o -> Boolean.TRUE.equals(o.getActive()))
                                .map(this::toOptionResponse)
                                .toList())
                        .build())
                .toList();
    }

    // ── Ordering: validate and price a customer's selection ───────────────────

    public record SelectedOption(Long optionId, String groupName, String optionName, BigDecimal priceDelta) {}

    public record AddonSelection(List<SelectedOption> options, BigDecimal unitDelta) {
        public static final AddonSelection NONE = new AddonSelection(List.of(), BigDecimal.ZERO);
    }

    /**
     * Validates the chosen option ids against the groups attached to the item at this location
     * and returns the per-unit price delta. Rejects unknown/inactive options and any group whose
     * selection count falls outside its min/max.
     */
    @Transactional(readOnly = true)
    public AddonSelection resolveSelection(Long locationId, Long itemId, List<Long> optionIds) {
        List<Long> requested = optionIds == null ? List.of() : optionIds.stream().distinct().toList();
        List<MenuItemAddonGroup> links = linkRepository
                .findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(itemId, locationId)
                .stream()
                .filter(link -> Boolean.TRUE.equals(link.getAddonGroup().getActive()))
                .toList();

        if (requested.isEmpty() && links.stream().noneMatch(l -> l.getAddonGroup().getMinSelect() > 0)) {
            return AddonSelection.NONE;
        }

        Map<Long, AddonOption> allowed = new HashMap<>();
        for (MenuItemAddonGroup link : links) {
            for (AddonOption option : link.getAddonGroup().getOptions()) {
                if (Boolean.TRUE.equals(option.getActive())) {
                    allowed.put(option.getId(), option);
                }
            }
        }

        List<SelectedOption> selected = new ArrayList<>();
        for (Long optionId : requested) {
            AddonOption option = allowed.get(optionId);
            if (option == null) {
                throw new IllegalArgumentException("add-on option " + optionId + " is not available for this item");
            }
            selected.add(new SelectedOption(option.getId(), option.getGroup().getName(),
                    option.getName(), option.getPriceDelta()));
        }

        for (MenuItemAddonGroup link : links) {
            AddonGroup group = link.getAddonGroup();
            long count = selected.stream()
                    .filter(s -> group.getOptions().stream().anyMatch(o -> o.getId().equals(s.optionId())))
                    .count();
            if (count < group.getMinSelect() || count > group.getMaxSelect()) {
                throw new IllegalArgumentException("'" + group.getName() + "' needs between "
                        + group.getMinSelect() + " and " + group.getMaxSelect() + " selections");
            }
        }

        BigDecimal unitDelta = selected.stream()
                .map(SelectedOption::priceDelta)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new AddonSelection(List.copyOf(selected), unitDelta);
    }

    /** Ids of menu items at this location that have at least one active add-on group (public). */
    @Transactional(readOnly = true)
    public List<Long> listItemIdsWithAddons(Long locationId) {
        return linkRepository.findMenuItemIdsWithActiveAddons(locationId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AddonGroup requireGroup(Long locationId, Long groupId) {
        return groupRepository.findByIdAndLocationId(groupId, locationId)
                .orElseThrow(() -> new NoSuchElementException("addon group not found"));
    }

    private void validateSelection(Integer min, Integer max) {
        if (min == null || max == null || min < 0 || max < 1 || min > max) {
            throw new IllegalArgumentException("invalid selection limits: min must be 0..max and max must be >= 1");
        }
    }

    private void applyGroup(AddonGroup group, GroupRequest req) {
        group.setName(req.getName().trim());
        group.setMinSelect(req.getMinSelect());
        group.setMaxSelect(req.getMaxSelect());
        group.setActive(req.getActive() == null || req.getActive());
        group.setDisplayOrder(req.getDisplayOrder() == null ? 0 : req.getDisplayOrder());

        if (req.getOptions() != null) {
            group.getOptions().clear();
            for (OptionRequest o : req.getOptions()) {
                group.getOptions().add(AddonOption.builder()
                        .group(group)
                        .name(o.getName().trim())
                        .priceDelta(o.getPriceDelta())
                        .active(o.getActive() == null || o.getActive())
                        .displayOrder(o.getDisplayOrder() == null ? 0 : o.getDisplayOrder())
                        .build());
            }
        }
    }

    private GroupResponse toGroupResponse(AddonGroup group) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .minSelect(group.getMinSelect())
                .maxSelect(group.getMaxSelect())
                .active(group.getActive())
                .displayOrder(group.getDisplayOrder())
                .options(group.getOptions().stream().map(this::toOptionResponse).toList())
                .build();
    }

    private OptionResponse toOptionResponse(AddonOption option) {
        return OptionResponse.builder()
                .id(option.getId())
                .name(option.getName())
                .priceDelta(option.getPriceDelta())
                .active(option.getActive())
                .displayOrder(option.getDisplayOrder())
                .build();
    }
}
