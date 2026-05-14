package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.DailyOrderSequence;
import com.broandbro.qrapp.repository.DailyOrderSequenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Service for generating human-readable, concurrent-safe order numbers.
 *
 * Order number format: BB-YYYYMMDD-XXX
 * Example: BB-20260515-0001
 *
 * Features:
 * - Resets sequence daily
 * - Thread-safe using pessimistic database locking
 * - No duplicate order numbers under concurrent load
 * - Production-ready error handling
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderNumberGenerator {

    private final DailyOrderSequenceRepository dailyOrderSequenceRepository;

    /**
     * Shop code used in order number generation.
     * Hardcoded to "BB" (single shop).
     * Configurable via application.properties/yml if needed in future.
     */
    @Value("${app.order.shop-code:BB}")
    private String shopCode;

    /**
     * Generates a human-readable order number in the format: BB-YYYYMMDD-XXXX
     *
     * Thread-safety mechanism:
     * 1. Query acquires pessimistic write lock on today's sequence row
     * 2. If sequence doesn't exist for today, create a new one with sequence=0
     * 3. Increment the sequence atomically
     * 4. Format and return the order number
     * 5. Lock is held until transaction completes
     *
     * @param localDate the local date for which to generate the sequence (typically today)
     * @return formatted order number (e.g., "BB-20260515-001")
     * @throws RuntimeException if database operations fail
     */
    @Transactional
    public String generateOrderNumber(LocalDate localDate) {
        // Validate input
        if (localDate == null) {
            throw new IllegalArgumentException("localDate cannot be null");
        }

        try {
            // Format date as YYYYMMDD
            String dateKey = localDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            log.debug("Generating order number for dateKey={}", dateKey);

            // Acquire pessimistic write lock on today's sequence row
            // This query uses SELECT FOR UPDATE to prevent concurrent increments
            var sequenceOpt = dailyOrderSequenceRepository.findByDateKeyWithLock(dateKey);

            DailyOrderSequence sequence;
            if (sequenceOpt.isEmpty()) {
                // First order of the day: create new sequence entry
                log.debug("Creating new daily sequence for dateKey={}", dateKey);
                sequence = new DailyOrderSequence();
                sequence.setDateKey(dateKey);
                sequence.setLastSequence(0); // Will be incremented below
            } else {
                // Subsequent orders on the same day: use existing sequence
                sequence = sequenceOpt.get();
                log.debug("Found existing daily sequence for dateKey={}, lastSequence={}",
                    dateKey, sequence.getLastSequence());
            }

            // Increment the sequence atomically while lock is held
            sequence.setLastSequence(sequence.getLastSequence() + 1);
            sequence = dailyOrderSequenceRepository.save(sequence);

            // Format order number: BB-YYYYMMDD-XXXX (sequence padded to 4 digits)
            String orderNumber = String.format(
                "%s-%s-%04d",
                shopCode,
                dateKey,
                sequence.getLastSequence()
            );

            log.info("Generated order number: {}", orderNumber);
            return orderNumber;

        } catch (Exception e) {
            log.error("Failed to generate order number for date={}", localDate, e);
            throw new RuntimeException("Failed to generate order number", e);
        }
    }

    /**
     * Convenience method using today's date (system timezone).
     *
     * @return formatted order number
     */
    public String generateOrderNumber() {
        return generateOrderNumber(LocalDate.now());
    }

    /**
     * Convenience method using today's date with explicit timezone.
     * Useful for ensuring consistent date behavior across deployments.
     *
     * @param zoneId the timezone to use for determining "today"
     * @return formatted order number
     */
    public String generateOrderNumber(ZoneId zoneId) {
        LocalDate today = LocalDate.now(zoneId);
        return generateOrderNumber(today);
    }
}

