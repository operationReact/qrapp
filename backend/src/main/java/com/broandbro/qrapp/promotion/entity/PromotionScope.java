package com.broandbro.qrapp.promotion.entity;

import com.broandbro.qrapp.promotion.enums.ScopeType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "promotion_scope")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionScope {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id", nullable = false)
    private Promotion promotion;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 30)
    private ScopeType scopeType;

    @Column(name = "scope_id", nullable = false)
    private Long scopeId;
}

