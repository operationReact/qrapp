package com.broandbro.qrapp.bundle.repository;

import com.broandbro.qrapp.bundle.entity.ItemComboRole;
import com.broandbro.qrapp.bundle.entity.ItemComboRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemComboRoleRepository extends JpaRepository<ItemComboRole, ItemComboRoleId> {

    /**
     * All role assignments for a single menu item, with the ComboRole eagerly fetched.
     * Ordered by displayOrder so the first entry is the primary role.
     */
    @Query("""
           SELECT icr FROM ItemComboRole icr
           JOIN FETCH icr.comboRole r
           WHERE icr.menuItem.id = :itemId
           ORDER BY r.displayOrder ASC
           """)
    List<ItemComboRole> findByItemIdWithRole(@Param("itemId") Long itemId);

    /**
     * Batch-fetch role assignments for a list of item IDs, ComboRole eagerly joined.
     * Ordered by displayOrder so putIfAbsent gives each item its primary role.
     */
    @Query("""
           SELECT icr FROM ItemComboRole icr
           JOIN FETCH icr.comboRole r
           WHERE icr.menuItem.id IN :itemIds
           ORDER BY r.displayOrder ASC
           """)
    List<ItemComboRole> findByItemIdsWithRoles(@Param("itemIds") List<Long> itemIds);

    /**
     * IDs of all items assigned to a specific role.
     * Lightweight — no MenuItem proxy loaded.
     */
    @Query("SELECT icr.menuItem.id FROM ItemComboRole icr WHERE icr.comboRole.id = :roleId")
    List<Long> findItemIdsByRoleId(@Param("roleId") Long roleId);

    /** Remove all role assignments for a given item. */
    @Modifying
    @Query("DELETE FROM ItemComboRole icr WHERE icr.menuItem.id = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);
}

