package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.dto.WalletTransactionSummaryDto;
import com.broandbro.qrapp.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Optional<WalletTransaction> findByReferenceId(String referenceId);

    @Query("""
            SELECT new com.broandbro.qrapp.dto.WalletTransactionSummaryDto(
                tx.id,
                tx.amount,
                tx.type,
                tx.status,
                tx.referenceId,
                tx.createdAt
            )
            FROM WalletTransaction tx
            WHERE tx.wallet.id = :walletId
            ORDER BY tx.createdAt DESC
            """)
    Page<WalletTransactionSummaryDto> findSummariesByWalletId(@Param("walletId") Long walletId, Pageable pageable);
}
