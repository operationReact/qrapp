package com.broandbro.qrapp.combo.repository;

import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.enums.ComboStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComboRepository extends JpaRepository<Combo, Long>, JpaSpecificationExecutor<Combo> {

    /** Find active (non-deleted) combo by id. */
    @Query("SELECT c FROM Combo c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<Combo> findActiveById(@Param("id") Long id);

    /** All non-deleted combos with pagination. */
    @Query("SELECT c FROM Combo c WHERE c.deletedAt IS NULL ORDER BY c.displayPriority DESC, c.id ASC")
    Page<Combo> findAllActive(Pageable pageable);

    /** Non-deleted, ACTIVE-status combos for public display, ordered by priority. */
    @Query("SELECT c FROM Combo c WHERE c.deletedAt IS NULL AND c.isActive = true AND c.status = com.broandbro.qrapp.enums.ComboStatus.ACTIVE ORDER BY c.displayPriority DESC, c.id ASC")
    List<Combo> findAllPublic();

    /** Count by status (non-deleted). */
    long countByStatusAndDeletedAtIsNull(ComboStatus status);

    long countByIsFeaturedTrueAndDeletedAtIsNull();
    long countByIsPreorderEligibleTrueAndDeletedAtIsNull();
    long countByIsSignatureComboTrueAndDeletedAtIsNull();
    long countByDeletedAtIsNull();
}

