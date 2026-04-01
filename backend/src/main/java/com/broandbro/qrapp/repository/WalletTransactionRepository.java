package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Optional<WalletTransaction> findByReferenceId(String referenceId);
    List<WalletTransaction> findAllByWallet_Id(Long walletId);
}
