package com.broandbro.qrapp.bundle.repository;

import com.broandbro.qrapp.bundle.entity.ComboRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComboRoleRepository extends JpaRepository<ComboRole, Long> {

    /** All active roles ordered by displayOrder ascending. */
    List<ComboRole> findByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<ComboRole> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    @Query("SELECT r FROM ComboRole r ORDER BY r.displayOrder ASC, r.name ASC")
    List<ComboRole> findAllOrdered();
}

