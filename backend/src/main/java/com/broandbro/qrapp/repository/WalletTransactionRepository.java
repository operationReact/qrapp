package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.dto.WalletTransactionSummaryDto;
import com.broandbro.qrapp.entity.WalletTransaction;
import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Optional<WalletTransaction> findByReferenceId(String referenceId);
    Optional<WalletTransaction> findByProviderOrderId(String providerOrderId);

    @Query("""
            SELECT new com.broandbro.qrapp.dto.WalletTransactionSummaryDto(
                tx.id,
                tx.amount,
                tx.type,
                tx.status,
                tx.referenceId,
                tx.providerOrderId,
                tx.orderId,
                tx.description,
                tx.balanceAfter,
                tx.createdAt
            )
            FROM WalletTransaction tx
            WHERE tx.wallet.id = :walletId
            ORDER BY tx.createdAt DESC
            """)
    Page<WalletTransactionSummaryDto> findSummariesByWalletId(@Param("walletId") Long walletId, Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(tx.amount), 0)
            FROM WalletTransaction tx
            WHERE tx.wallet.id = :walletId
              AND tx.type = :type
              AND tx.status = :status
            """)
    Long sumAmountByWalletIdAndTypeAndStatus(@Param("walletId") Long walletId,
                                             @Param("type") TransactionType type,
                                             @Param("status") TransactionStatus status);

    long countByWallet_IdAndTypeAndStatus(Long walletId, TransactionType type, TransactionStatus status);

    @Query("""
            SELECT COALESCE(SUM(tx.amount), 0)
            FROM WalletTransaction tx
            WHERE tx.wallet.id = :walletId
              AND tx.status = :status
            """)
    Long sumAmountByWalletIdAndStatus(@Param("walletId") Long walletId,
                                      @Param("status") TransactionStatus status);

    @Query("""
            SELECT MAX(tx.createdAt)
            FROM WalletTransaction tx
            WHERE tx.wallet.id = :walletId
            """)
    Instant findLatestCreatedAtByWalletId(@Param("walletId") Long walletId);
}
