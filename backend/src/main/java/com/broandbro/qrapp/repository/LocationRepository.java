package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);
    List<Location> findByActiveTrueOrderByNameAsc();

    @Query(value = "SELECT nextval('locations_global_code_seq')", nativeQuery = true)
    long nextGlobalCodeSequence();
}
