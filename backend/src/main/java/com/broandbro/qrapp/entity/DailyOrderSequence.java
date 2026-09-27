package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity to manage daily order number sequences per location.
 * Ensures concurrency-safe order number generation with pessimistic locking.
 *
 * Format: {LOCATION_CODE}-YYYYMMDD-XXXX
 * Example: PRAGATI-TG-001-20260515-0001
 *
 * One sequence per location per day.
 * Legacy sequences with location_code=NULL remain for backward compatibility.
 */
@Entity
@Table(name = "daily_order_sequence", uniqueConstraints = {
    @UniqueConstraint(name = "uq_daily_order_sequence_location_date",
        columnNames = {"location_code", "date_key"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyOrderSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Location code for this sequence (e.g., PRAGATI-TG-001).
     * Null for legacy sequences (old BB-only behavior).
     * Combined with dateKey to form unique per-location-per-day sequences.
     */
    @Column(name = "location_code", length = 80)
    private String locationCode;

    /**
     * Date key in YYYYMMDD format (e.g., 20260515).
     * Combined with locationCode to form unique per-location-per-day sequences.
     */
    @Column(name = "date_key", nullable = false, length = 8)
    private String dateKey;

    /**
     * Last sequence number used for this location on this date.
     * Incremented for each order created on this date for this location.
     * Starts from 0 when a new day's sequence is created.
     */
    @Column(name = "last_sequence", nullable = false)
    private Integer lastSequence = 0;
}
