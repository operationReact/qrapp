package com.broandbro.qrapp.combo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;

import java.sql.Types;
import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "combo_schedule",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_combo_schedule_day", columnNames = {"combo_id", "day_of_week"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    /**
     * ISO-8601 day: 1=Monday … 7=Sunday.
     * Uses SMALLINT in DB; @JdbcTypeCode aligns schema validation.
     */
    @Column(name = "day_of_week", nullable = false)
    @JdbcTypeCode(Types.SMALLINT)
    private Integer dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

