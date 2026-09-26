package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByCode(String code);
    boolean existsByCode(String code);
    List<Location> findByActiveTrueOrderByNameAsc();

    @Query(value = "SELECT pg_advisory_xact_lock(hashtext(:prefix))", nativeQuery = true)
    void lockCodePrefix(@Param("prefix") String prefix);

    @Query(value = """
            SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM LENGTH(:prefix) + 2 FOR 3) AS INTEGER)), 0)
            FROM locations
            WHERE code LIKE CONCAT(:prefix, '-%')
            """, nativeQuery = true)
    int findMaxSequence(@Param("prefix") String prefix);
}
