package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * L2a – Nightly-computed item co-occurrence statistics.
 * confidence = co_count / item_a_count  (P(B|A))
 */
@Entity
@Table(name = "rec_co_occurrence_stat")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CoOccurrenceStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_a_id", nullable = false)
    private MenuItem itemA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_b_id", nullable = false)
    private MenuItem itemB;

    @Column(name = "co_count", nullable = false)
    @Builder.Default
    private Integer coCount = 0;

    @Column(name = "item_a_count", nullable = false)
    @Builder.Default
    private Integer itemACount = 0;

    @Column(name = "confidence", nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal confidence = BigDecimal.ZERO;

    @Column(name = "lift", nullable = false, precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal lift = BigDecimal.ZERO;

    @Column(name = "computed_at", nullable = false)
    @Builder.Default
    private Instant computedAt = Instant.now();
}

