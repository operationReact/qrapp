package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import com.broandbro.qrapp.enums.InventoryAuditActionType;
import java.time.Instant;

/**
 * Audit trail for all inventory changes.
 *
 * Tracks:
 * - Who made the change (admin user)
 * - When the change occurred
 * - What type of change (order deduction, manual update, etc.)
 * - Old and new quantities
 * - Reason for the change
 */
@Entity
@Table(name = "inventory_audit", indexes = {
    @Index(name = "idx_inventory_audit_menu_item_id", columnList = "menu_item_id"),
    @Index(name = "idx_inventory_audit_created_at", columnList = "created_at"),
    @Index(name = "idx_inventory_audit_action_type", columnList = "action_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Menu item for which inventory was changed.
     */
    @Column(name = "menu_item_id", nullable = false)
    private Long menuItemId;

    /**
     * Type of action that triggered this audit entry.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private InventoryAuditActionType actionType;

    /**
     * Quantity before the change.
     */
    @Column(name = "old_quantity")
    private Long oldQuantity;

    /**
     * Quantity after the change.
     */
    @Column(name = "new_quantity")
    private Long newQuantity;

    /**
     * User ID who made this change (admin user ID).
     * null if change was automatic (e.g., auto out-of-stock trigger).
     */
    @Column(name = "changed_by")
    private Long changedBy;

    /**
     * Human-readable username / phone of the admin who made the change.
     * Populated from SecurityContextHolder at the time of the change.
     */
    @Column(name = "changed_by_name", length = 100)
    private String changedByName;

    /**
     * Reason for this inventory change.
     * Example: "Morning stock refill", "Order #123 cancelled", etc.
     */
    @Column(name = "reason", length = 512)
    private String reason;

    /**
     * Reference ID for tracking related operations.
     * Example: Order ID when reason is order deduction.
     */
    @Column(name = "reference_id")
    private String referenceId;

    /**
     * Timestamp when this change occurred.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ============================================================================
    // LIFECYCLE METHODS
    // ============================================================================

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

