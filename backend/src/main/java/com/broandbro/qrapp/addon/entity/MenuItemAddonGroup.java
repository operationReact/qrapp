package com.broandbro.qrapp.addon.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;

/**
 * Attaches an {@link AddonGroup} to a menu item. The unique constraint on
 * (menu_item_id, addon_group_id) prevents duplicate links.
 */
@Entity
@Table(name = "menu_item_addon_group")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuItemAddonGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "addon_group_id", nullable = false)
    private AddonGroup addonGroup;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
