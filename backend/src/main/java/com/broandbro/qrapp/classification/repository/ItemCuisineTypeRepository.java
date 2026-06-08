package com.broandbro.qrapp.classification.repository;

import com.broandbro.qrapp.classification.entity.ItemCuisineType;
import com.broandbro.qrapp.classification.entity.ItemCuisineTypeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemCuisineTypeRepository extends JpaRepository<ItemCuisineType, ItemCuisineTypeId> {

    /**
     * All cuisine-type assignments for a single menu item, with CuisineType eagerly fetched.
     */
    @Query("""
           SELECT ict FROM ItemCuisineType ict
           JOIN FETCH ict.cuisineType ct
           WHERE ict.menuItem.id = :itemId
           ORDER BY ct.displayOrder ASC
           """)
    List<ItemCuisineType> findByItemIdWithCuisineType(@Param("itemId") Long itemId);

    /**
     * Batch-fetch cuisine-type assignments for a list of item IDs.
     */
    @Query("""
           SELECT ict FROM ItemCuisineType ict
           JOIN FETCH ict.cuisineType ct
           WHERE ict.menuItem.id IN :itemIds
           ORDER BY ct.displayOrder ASC
           """)
    List<ItemCuisineType> findByItemIdsWithCuisineTypes(@Param("itemIds") List<Long> itemIds);

    /**
     * IDs of all items assigned to a specific cuisine type.
     */
    @Query("SELECT ict.menuItem.id FROM ItemCuisineType ict WHERE ict.cuisineType.id = :cuisineTypeId")
    List<Long> findItemIdsByCuisineTypeId(@Param("cuisineTypeId") Long cuisineTypeId);

    /** Remove all cuisine-type assignments for a given item. */
    @Modifying
    @Query("DELETE FROM ItemCuisineType ict WHERE ict.menuItem.id = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);
}

