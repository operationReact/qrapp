package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceConfigurationRepository extends JpaRepository<InvoiceConfiguration, Long> {
    Optional<InvoiceConfiguration> findTopByOrderByIdAsc();
}
