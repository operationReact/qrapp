package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.TaxProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaxProfileRepository extends JpaRepository<TaxProfile, Long> {
    Optional<TaxProfile> findByCode(String code);

}
