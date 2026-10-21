package com.broandbro.qrapp.addon.repository;

import com.broandbro.qrapp.addon.entity.AddonGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddonGroupRepository extends JpaRepository<AddonGroup, Long> {

    List<AddonGroup> findByLocationIdOrderByDisplayOrderAscIdAsc(Long locationId);

    Optional<AddonGroup> findByIdAndLocationId(Long id, Long locationId);
}
