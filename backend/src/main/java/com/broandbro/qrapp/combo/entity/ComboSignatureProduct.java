package com.broandbro.qrapp.combo.entity;

import com.broandbro.qrapp.signature.entity.SignatureProduct;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "combo_signature_products",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_combo_sig_product", columnNames = {"combo_id", "signature_product_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboSignatureProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "signature_product_id", nullable = false)
    private SignatureProduct signatureProduct;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

