package com.broandbro.qrapp.addon.repository;

import com.broandbro.qrapp.addon.entity.MenuItemAddonGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MenuItemAddonGroupRepository extends JpaRepository<MenuItemAddonGroup, Long> {

    List<MenuItemAddonGroup> findByMenuItemIdAndMenuItemLocationIdOrderByDisplayOrderAscIdAsc(
            Long menuItemId, Long locationId);

    Optional<MenuItemAddonGroup> findByMenuItemIdAndAddonGroupId(Long menuItemId, Long addonGroupId);

    @Query("select distinct l.menuItem.id from MenuItemAddonGroup l "
            + "where l.menuItem.location.id = :locationId and l.addonGroup.active = true")
    List<Long> findMenuItemIdsWithActiveAddons(@Param("locationId") Long locationId);
}
