package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.enums.SuggestionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * L2b – Auto-generated suggestion waiting for admin Accept/Reject.
 * Created nightly by the CoOccurrenceScheduler.
 */
@Entity
@Table(name = "rec_auto_suggestion")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AutoSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_a_id", nullable = false)
    private MenuItem itemA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_b_id", nullable = false)
    private MenuItem itemB;

    @Column(name = "confidence", nullable = false, precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "co_count", nullable = false)
    @Builder.Default
    private Integer coCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SuggestionStatus status = SuggestionStatus.PENDING;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

