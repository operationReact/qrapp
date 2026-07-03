package com.broandbro.qrapp.signature.repository;

import com.broandbro.qrapp.signature.entity.SignatureProductInventoryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SignatureProductInventoryLogRepository extends JpaRepository<SignatureProductInventoryLog, Long> {
    Page<SignatureProductInventoryLog> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);
}

