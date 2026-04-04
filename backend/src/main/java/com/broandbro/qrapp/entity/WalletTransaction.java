package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Column(nullable = false)
    private Long amount; // smallest currency unit (paise)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column(name = "reference_id", length = 128)
    private String referenceId; // e.g., razorpay_payment_id or custom reference

    @Column(name = "provider_order_id", length = 128)
    private String providerOrderId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "balance_after")
    private Long balanceAfter;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

