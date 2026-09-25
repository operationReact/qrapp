package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.HallOfHappinessSubmissionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "hall_of_happiness_submissions", indexes = {
        @Index(name = "idx_hall_submission_order", columnList = "party_order_id"),
        @Index(name = "idx_hall_submission_customer", columnList = "customer_id"),
        @Index(name = "idx_hall_submission_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HallOfHappinessSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "party_order_id", nullable = false)
    private PartyOrder partyOrder;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "consent_accepted", nullable = false)
    private boolean consentAccepted;

    @Column(name = "consent_accepted_at", nullable = false)
    private Instant consentAcceptedAt;

    @Column(name = "terms_version", nullable = false, length = 80)
    private String termsVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private HallOfHappinessSubmissionStatus status = HallOfHappinessSubmissionStatus.PENDING_REVIEW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (submittedAt == null) submittedAt = now;
        if (consentAcceptedAt == null) consentAcceptedAt = now;
        if (status == null) status = HallOfHappinessSubmissionStatus.PENDING_REVIEW;
    }
}
