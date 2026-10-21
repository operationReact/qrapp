package com.broandbro.qrapp.addon.entity;

import com.broandbro.qrapp.entity.Location;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A named set of add-on options (e.g. "Extra toppings") scoped to one location.
 * A group is attached to menu items through {@link MenuItemAddonGroup}.
 */
@Entity
@Table(name = "addon_group")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AddonGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    /** Minimum number of options the customer must pick (0 = optional). */
    @Column(name = "min_select", nullable = false)
    @Builder.Default
    private Integer minSelect = 0;

    /** Maximum number of options the customer may pick. */
    @Column(name = "max_select", nullable = false)
    @Builder.Default
    private Integer maxSelect = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, id ASC")
    @Builder.Default
    private List<AddonOption> options = new ArrayList<>();
}
