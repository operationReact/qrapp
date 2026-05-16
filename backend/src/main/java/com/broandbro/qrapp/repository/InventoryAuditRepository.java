package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.InventoryAudit;
import com.broandbro.qrapp.enums.InventoryAuditActionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for InventoryAudit entity.
 *
 * Provides efficient queries for audit trail retrieval and reporting.
 */
@Repository
public interface InventoryAuditRepository extends JpaRepository<InventoryAudit, Long> {

    /**
     * Find all audit entries for a menu item.
     *
     * @param menuItemId menu item ID
     * @param pageable pagination info
     * @return paginated audit entries, newest first
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.menuItemId = :menuItemId 
        ORDER BY a.createdAt DESC
        """)
    Page<InventoryAudit> findByMenuItemId(@Param("menuItemId") Long menuItemId, Pageable pageable);

    /**
     * Find audit entries for multiple menu items.
     *
     * @param menuItemIds list of menu item IDs
     * @param pageable pagination info
     * @return paginated audit entries
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.menuItemId IN :menuItemIds 
        ORDER BY a.createdAt DESC
        """)
    Page<InventoryAudit> findByMenuItemIds(@Param("menuItemIds") List<Long> menuItemIds, Pageable pageable);

    /**
     * Find audit entries by action type.
     *
     * @param actionType type of action
     * @param pageable pagination info
     * @return paginated audit entries
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.actionType = :actionType 
        ORDER BY a.createdAt DESC
        """)
    Page<InventoryAudit> findByActionType(@Param("actionType") InventoryAuditActionType actionType, Pageable pageable);

    /**
     * Find audit entries by user (who made the change).
     *
     * @param changedBy user ID
     * @param pageable pagination info
     * @return paginated audit entries
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.changedBy = :changedBy 
        ORDER BY a.createdAt DESC
        """)
    Page<InventoryAudit> findByChangedBy(@Param("changedBy") Long changedBy, Pageable pageable);

    /**
     * Find audit entries within a time range.
     *
     * @param startTime start timestamp (inclusive)
     * @param endTime end timestamp (inclusive)
     * @param pageable pagination info
     * @return paginated audit entries
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.createdAt BETWEEN :startTime AND :endTime 
        ORDER BY a.createdAt DESC
        """)
    Page<InventoryAudit> findByCreatedAtBetween(@Param("startTime") Instant startTime, @Param("endTime") Instant endTime, Pageable pageable);

    /**
     * Find recent audit entries (most recent changes).
     *
     * @param limit number of entries to return
     * @return list of recent audit entries
     */
    @Query(value = """
        SELECT a FROM InventoryAudit a 
        ORDER BY a.createdAt DESC
        """, nativeQuery = false)
    List<InventoryAudit> findRecentAudits(Pageable pageable);

    /**
     * Count audit entries for a menu item.
     *
     * @param menuItemId menu item ID
     * @return count of audit entries
     */
    long countByMenuItemId(Long menuItemId);

    /**
     * Find last audit entry for a menu item.
     *
     * @param menuItemId menu item ID
     * @return most recent audit entry for this item
     */
    @Query("""
        SELECT a FROM InventoryAudit a 
        WHERE a.menuItemId = :menuItemId 
        ORDER BY a.createdAt DESC 
        LIMIT 1
        """)
    List<InventoryAudit> findLastAuditEntry(@Param("menuItemId") Long menuItemId);
}

