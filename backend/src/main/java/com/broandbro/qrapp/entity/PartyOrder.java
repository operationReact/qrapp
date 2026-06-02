package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.PartyOrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "menu_description", nullable = true, columnDefinition = "TEXT")
    private String menuDescription;

    /** Structured menu items — replaces the old free-text menuDescription. */
    @OneToMany(mappedBy = "partyOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PartyOrderMenuItem> menuItems = new ArrayList<>();

    /** Optional location / venue hint provided by user. */
    @Column(name = "venue", length = 255)
    private String venue;

    /** Type of event — Birthday, Wedding, Corporate, etc. */
    @Column(name = "event_type", length = 50)
    private String eventType;

    /** Any special requirements — serving staff, dietary restrictions, etc. */
    @Column(name = "special_notes", columnDefinition = "TEXT")
    private String specialNotes;

    /** Optional budget the customer has in mind. */
    @Column(name = "budget_amount", precision = 12, scale = 2)
    private BigDecimal budgetAmount;

    // ── Status & Estimate ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PartyOrderStatus status;

    /** Total quoted price = sum of all menu item quotedPrice. */
    @Column(name = "estimated_total_amount", precision = 12, scale = 2)
    private BigDecimal estimatedTotalAmount;

    /** Total estimated cost (admin internal). */
    @Column(name = "estimated_total_expense", precision = 12, scale = 2)
    private BigDecimal estimatedTotalExpense;

    /** Profit = estimatedTotalAmount - estimatedTotalExpense (admin internal). */
    @Column(name = "estimated_total_profit", precision = 12, scale = 2)
    private BigDecimal estimatedTotalProfit;

    /** Legacy simple estimate amount — kept for backward compat. */
    @Column(name = "estimated_amount", precision = 12, scale = 2)
    private BigDecimal estimatedAmount;

    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "INR";

    /** Admin can leave a note explaining the estimate. */
    @Column(name = "estimate_note", columnDefinition = "TEXT")
    private String estimateNote;

    /** Internal admin-only notes. Never exposed to users. */
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    /** Admin username who submitted the estimate. */
    @Column(name = "estimate_submitted_by", length = 100)
    private String estimateSubmittedBy;

    /** When the estimate was sent to the user. */
    @Column(name = "estimate_sent_at")
    private Instant estimateSentAt;

    /** When estimate expires (48h after sent, configurable). */
    @Column(name = "estimate_expires_at")
    private Instant estimateExpiresAt;

    /** 30% advance amount required. */
    @Column(name = "advance_required_amount", precision = 12, scale = 2)
    private BigDecimal advanceRequiredAmount;

    @Column(name = "advance_paid_amount", precision = 12, scale = 2)
    private BigDecimal advancePaidAmount;

    @Column(name = "advance_paid")
    @Builder.Default
    private Boolean advancePaid = false;

    @Column(name = "advance_paid_at")
    private Instant advancePaidAt;

    @Column(name = "confirmation_started_at")
    private Instant confirmationStartedAt;

    @Column(name = "event_countdown_started")
    @Builder.Default
    private Boolean eventCountdownStarted = false;

    @Column(name = "callback_requested")
    @Builder.Default
    private Boolean callbackRequested = false;

    // ── Balance payment (after DELIVERED) ────────────────────────────────────

    /** Remaining balance = estimatedTotalAmount - advancePaidAmount. Set when admin marks DELIVERED. */
    @Column(name = "balance_amount", precision = 12, scale = 2)
    private BigDecimal balanceAmount;

    @Column(name = "balance_paid")
    @Builder.Default
    private Boolean balancePaid = false;

    @Column(name = "balance_paid_amount", precision = 12, scale = 2)
    private BigDecimal balancePaidAmount;

    @Column(name = "balance_paid_at")
    private Instant balancePaidAt;

    /** When admin marked the order as DELIVERED. */
    @Column(name = "delivered_at")
    private Instant deliveredAt;

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
        if (status == null) status = PartyOrderStatus.NEW;
        if (currency == null) currency = "INR";
        if (advancePaid == null) advancePaid = false;
        if (eventCountdownStarted == null) eventCountdownStarted = false;
        if (callbackRequested == null) callbackRequested = false;
        if (balancePaid == null) balancePaid = false;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}

