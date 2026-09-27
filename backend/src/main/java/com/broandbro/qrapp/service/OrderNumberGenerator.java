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
 * Supports two formats:
 * 1. Location-specific (NEW): {LOCATION_CODE}-YYYYMMDD-XXXX
 *    Example: PRAGATI-TG-001-20260515-0001
 *
 * 2. Legacy (OLD): BB-YYYYMMDD-XXXX
 *    Example: BB-20260515-0001
 *
 * Features:
 * - Per-location sequence (one per day per location)
 * - Backward compatible with legacy BB-only sequence
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
     * Legacy location code fallback (for backward compatibility).
     * Used when locationCode is not provided to generateOrderNumber().
     */
    @Value("${app.order.location-code:${app.order.shop-code:BB}}")
    private String legacyLocationCode;

    /**
     * Generates a location-specific order number in the format: {LOCATION_CODE}-YYYYMMDD-XXXX
     *
     * Thread-safety mechanism:
     * 1. Query acquires pessimistic write lock on today's sequence row for this location
     * 2. If sequence doesn't exist for today/location, create a new one with sequence=0
     * 3. Increment the sequence atomically
     * 4. Format and return the order number
     * 5. Lock is held until transaction completes
     *
     * @param locationCode the location code (e.g., PRAGATI-TG-001, or null for legacy BB format)
     * @param localDate the local date for which to generate the sequence (typically today)
     * @return formatted order number (e.g., "PRAGATI-TG-001-20260515-0001" or "BB-20260515-0001")
     * @throws IllegalArgumentException if locationCode is empty or localDate is null
     * @throws RuntimeException if database operations fail
     */
    @Transactional
    public String generateOrderNumber(String locationCode, LocalDate localDate) {
        // Validate inputs
        if (localDate == null) {
            throw new IllegalArgumentException("localDate cannot be null");
        }

        // Use legacy format if locationCode not provided
        if (locationCode == null || locationCode.isBlank()) {
            return generateOrderNumberLegacy(localDate);
        }

        try {
            // Format date as YYYYMMDD
            String dateKey = localDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            log.debug("Generating location-specific order number for locationCode={}, dateKey={}", 
                locationCode, dateKey);

            // Acquire pessimistic write lock on today's sequence row for this location
            var sequenceOpt = dailyOrderSequenceRepository.findByLocationCodeAndDateKeyWithLock(locationCode, dateKey);

            DailyOrderSequence sequence;
            if (sequenceOpt.isEmpty()) {
                // First order of the day for this location: create new sequence entry
                log.debug("Creating new daily sequence for locationCode={}, dateKey={}", locationCode, dateKey);
                sequence = new DailyOrderSequence();
                sequence.setLocationCode(locationCode);
                sequence.setDateKey(dateKey);
                sequence.setLastSequence(0); // Will be incremented below
            } else {
                // Subsequent orders on the same day for this location: use existing sequence
                sequence = sequenceOpt.get();
                log.debug("Found existing daily sequence for locationCode={}, dateKey={}, lastSequence={}",
                    locationCode, dateKey, sequence.getLastSequence());
            }

            // Increment the sequence atomically while lock is held
            sequence.setLastSequence(sequence.getLastSequence() + 1);
            sequence = dailyOrderSequenceRepository.save(sequence);

            // Format order number: {LOCATION_CODE}-YYYYMMDD-XXXX (sequence padded to 4 digits)
            String orderNumber = String.format(
                "%s-%s-%04d",
                locationCode,
                dateKey,
                sequence.getLastSequence()
            );

            log.info("Generated location-specific order number: {}", orderNumber);
            return orderNumber;

        } catch (Exception e) {
            log.error("Failed to generate order number for locationCode={}, date={}", locationCode, localDate, e);
            throw new RuntimeException("Failed to generate order number", e);
        }
    }

    /**
     * Legacy order number generation (BB-only, backward compatible).
     * Format: BB-YYYYMMDD-XXXX
     *
     * @param localDate the local date for which to generate the sequence
     * @return formatted order number (e.g., "BB-20260515-0001")
     */
    @Transactional
    private String generateOrderNumberLegacy(LocalDate localDate) {
        try {
            String dateKey = localDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            log.debug("Generating legacy order number for dateKey={}", dateKey);

            // Query for legacy sequence (locationCode IS NULL)
            var sequenceOpt = dailyOrderSequenceRepository.findByDateKeyWithLock(dateKey);

            DailyOrderSequence sequence;
            if (sequenceOpt.isEmpty()) {
                log.debug("Creating new legacy daily sequence for dateKey={}", dateKey);
                sequence = new DailyOrderSequence();
                sequence.setLocationCode(null); // Legacy marker
                sequence.setDateKey(dateKey);
                sequence.setLastSequence(0);
            } else {
                sequence = sequenceOpt.get();
                log.debug("Found existing legacy daily sequence for dateKey={}, lastSequence={}",
                    dateKey, sequence.getLastSequence());
            }

            sequence.setLastSequence(sequence.getLastSequence() + 1);
            sequence = dailyOrderSequenceRepository.save(sequence);

            String orderNumber = String.format(
                "%s-%s-%04d",
                legacyLocationCode,
                dateKey,
                sequence.getLastSequence()
            );

            log.info("Generated legacy order number: {}", orderNumber);
            return orderNumber;

        } catch (Exception e) {
            log.error("Failed to generate legacy order number for date={}", localDate, e);
            throw new RuntimeException("Failed to generate legacy order number", e);
        }
    }

    /**
     * Generates location-specific order number using today's date (system timezone).
     *
     * @param locationCode the location code (e.g., PRAGATI-TG-001)
     * @return formatted order number
     */
    public String generateOrderNumber(String locationCode) {
        return generateOrderNumber(locationCode, LocalDate.now());
    }

    /**
     * Generates location-specific order number using today's date with explicit timezone.
     * Useful for ensuring consistent date behavior across deployments.
     *
     * @param locationCode the location code (e.g., PRAGATI-TG-001)
     * @param zoneId the timezone to use for determining "today"
     * @return formatted order number
     */
    public String generateOrderNumber(String locationCode, ZoneId zoneId) {
        LocalDate today = LocalDate.now(zoneId);
        return generateOrderNumber(locationCode, today);
    }

    /**
     * Legacy convenience method using today's date (system timezone).
     * Generates BB-format order numbers.
     *
     * @return formatted order number (BB-YYYYMMDD-XXXX)
     */
    public String generateOrderNumber() {
        return generateOrderNumber((String) null, LocalDate.now());
    }

    /**
     * Legacy convenience method with explicit timezone.
     *
     * @param zoneId the timezone to use for determining "today"
     * @return formatted order number (BB-YYYYMMDD-XXXX)
     */
    public String generateOrderNumberLegacy(ZoneId zoneId) {
        LocalDate today = LocalDate.now(zoneId);
        return generateOrderNumber((String) null, today);
    }
}
