package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.PartyOrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "party_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── User details ────────────────────────────────────────────────────────
    @Column(name = "user_id")
    private Long userId;

    /** Denormalised for quick display without a join. */
    @Column(name = "user_phone", length = 20)
    private String userPhone;

    @Column(name = "user_name", length = 100)
    private String userName;

    // ── Event details ────────────────────────────────────────────────────────
    @Column(name = "event_date_time", nullable = false)
    private LocalDateTime eventDateTime;

    @Column(name = "number_of_people", nullable = false)
    private Integer numberOfPeople;

    @Column(name = "menu_description", nullable = false, columnDefinition = "TEXT")
    private String menuDescription;

    /** Optional location / venue hint provided by user. */
    @Column(name = "venue", length = 255)
    private String venue;

    // ── Status & Estimate ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PartyOrderStatus status;

    /** Set by admin when submitting estimate. */
    @Column(name = "estimated_amount", precision = 12, scale = 2)
    private BigDecimal estimatedAmount;

    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "INR";

    /** Admin can leave a note explaining the estimate. */
    @Column(name = "estimate_note", columnDefinition = "TEXT")
    private String estimateNote;

    /** Admin username who submitted the estimate. */
    @Column(name = "estimate_submitted_by", length = 100)
    private String estimateSubmittedBy;

    /** When the estimate was sent to the user. */
    @Column(name = "estimate_sent_at")
    private Instant estimateSentAt;

    /** When user confirmed or rejected. */
    @Column(name = "user_responded_at")
    private Instant userRespondedAt;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = PartyOrderStatus.PENDING_ESTIMATE;
        if (currency == null) currency = "INR";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}

