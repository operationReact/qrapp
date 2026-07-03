package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tracks which spending milestones a user has already been rewarded for.
 * One row per (user, milestone) pair — ensures we never double-issue.
 */
@Entity
@Table(
    name = "user_milestone",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "milestone_amount"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** The milestone threshold that was crossed, e.g. 500, 1000, 2500 */
    @Column(name = "milestone_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal milestoneAmount;

    /** The coupon code that was issued */
    @Column(name = "coupon_code", nullable = false, length = 50)
    private String couponCode;

    /** Lifetime spend at the time the milestone was crossed */
    @Column(name = "lifetime_spend_at_award", nullable = false, precision = 12, scale = 2)
    private BigDecimal lifetimeSpendAtAward;

    @Column(name = "awarded_at", nullable = false)
    private LocalDateTime awardedAt;

    @PrePersist
    protected void onCreate() {
        if (awardedAt == null) awardedAt = LocalDateTime.now();
    }
}

