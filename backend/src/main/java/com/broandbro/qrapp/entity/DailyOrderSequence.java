package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity to manage daily order number sequences.
 * Ensures concurrency-safe order number generation with pessimistic locking.
 *
 * Format: BB-YYYYMMDD-XXXX
 * Example: BB-20260515-0001
 *
 * Single global sequence per day (one shop: BB).
 */
@Entity
@Table(name = "daily_order_sequence")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyOrderSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Date key in YYYYMMDD format (e.g., 20260515).
     * Enables daily sequence reset automatically.
     * Unique key since we have only one sequence per day.
     */
    @Column(name = "date_key", nullable = false, length = 8, unique = true)
    private String dateKey;

    /**
     * Last sequence number used for the day.
     * Incremented for each order created on this date.
     * Starts from 0 when a new day's sequence is created.
     */
    @Column(name = "last_sequence", nullable = false)
    private Integer lastSequence = 0;
}

