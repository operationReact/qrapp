package com.broandbro.qrapp.promotion.entity;

import com.broandbro.qrapp.promotion.enums.PromoType;
import com.broandbro.qrapp.promotion.enums.StackMode;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "promotion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "promo_type", nullable = false, length = 30)
    private PromoType promoType;

    @Enumerated(EnumType.STRING)
    @Column(name = "stack_mode", nullable = false, length = 30)
    private StackMode stackMode;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "is_first_order_only", nullable = false)
    private Boolean isFirstOrderOnly;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "total_usage_limit")
    private Integer totalUsageLimit;

    @Column(name = "per_user_limit")
    private Integer perUserLimit;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "promotion", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<PromotionRuleEntity> rules = new ArrayList<>();

    @OneToMany(mappedBy = "promotion", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<PromotionScope> scopes = new ArrayList<>();

    @OneToOne(mappedBy = "promotion", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    private PromotionReward reward;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null)           isActive           = true;
        if (isFirstOrderOnly == null)   isFirstOrderOnly   = false;
        if (promoType == null)          promoType          = PromoType.COUPON_CODE;
        if (stackMode == null)          stackMode          = StackMode.NONE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

