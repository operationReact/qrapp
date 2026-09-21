package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByCode(String code);
    List<Location> findByActiveTrueOrderByNameAsc();
}
