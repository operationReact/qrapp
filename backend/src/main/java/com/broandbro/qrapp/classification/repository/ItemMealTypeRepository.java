package com.broandbro.qrapp.classification.repository;

import com.broandbro.qrapp.classification.entity.ItemMealType;
import com.broandbro.qrapp.classification.entity.ItemMealTypeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemMealTypeRepository extends JpaRepository<ItemMealType, ItemMealTypeId> {

    /**
     * All meal-type assignments for a single menu item, with MealType eagerly fetched.
     * Ordered by displayOrder.
     */
    @Query("""
           SELECT imt FROM ItemMealType imt
           JOIN FETCH imt.mealType mt
           WHERE imt.menuItem.id = :itemId
           ORDER BY mt.displayOrder ASC
           """)
    List<ItemMealType> findByItemIdWithMealType(@Param("itemId") Long itemId);

    /**
     * Batch-fetch meal-type assignments for a list of item IDs.
     */
    @Query("""
           SELECT imt FROM ItemMealType imt
           JOIN FETCH imt.mealType mt
           WHERE imt.menuItem.id IN :itemIds
           ORDER BY mt.displayOrder ASC
           """)
    List<ItemMealType> findByItemIdsWithMealTypes(@Param("itemIds") List<Long> itemIds);

    /**
     * IDs of all items assigned to a specific meal type.
     */
    @Query("SELECT imt.menuItem.id FROM ItemMealType imt WHERE imt.mealType.id = :mealTypeId")
    List<Long> findItemIdsByMealTypeId(@Param("mealTypeId") Long mealTypeId);

    /** Remove all meal-type assignments for a given item. */
    @Modifying
    @Query("DELETE FROM ItemMealType imt WHERE imt.menuItem.id = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);
}

