package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.DailyOrderSequence;
import com.broandbro.qrapp.repository.DailyOrderSequenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Tests for location-specific order ID generation.
 *
 * Verifies:
 * 1. Location-specific format: {LOCATION_CODE}-YYYYMMDD-XXXX
 * 2. Legacy format fallback: BB-YYYYMMDD-XXXX
 * 3. Sequence padding to 4 digits
 * 4. Validation (null date rejection)
 *
 * Note: Concurrent safety and complex mocking scenarios are best verified
 * via integration tests with real database and transactional context.
 */
@ExtendWith(MockitoExtension.class)
class LocationSpecificOrderIdGenerationTest {

    @Mock
    private DailyOrderSequenceRepository sequenceRepository;

    private OrderNumberGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new OrderNumberGenerator(sequenceRepository);
        // Set legacy location code for fallback tests
        ReflectionTestUtils.setField(generator, "legacyLocationCode", "BB");
    }

    /**
     * TEST 1: Generate order ID with location code for new order
     *
     * Given: Location code "PRAGATI-TG-001"
     * When: Generating order number for 2026-09-27
     * Then: Format is PRAGATI-TG-001-20260927-0001
     */
    @Test
    void generatesLocationSpecificOrderId() {
        LocalDate date = LocalDate.of(2026, 9, 27);
        String locationCode = "PRAGATI-TG-001";

        // First order of the day for this location
        DailyOrderSequence seq = new DailyOrderSequence();
        seq.setLocationCode(locationCode);
        seq.setDateKey("20260927");
        seq.setLastSequence(0);

        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(locationCode, "20260927"))
                .thenReturn(Optional.empty());
        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(1L);
                    return arg;
                });

        String orderNumber = generator.generateOrderNumber(locationCode, date);

        assertThat(orderNumber).isEqualTo("PRAGATI-TG-001-20260927-0001");
    }

    /**
     * TEST 2: Different locations use separate sequences
     *
     * Given: Two locations
     * When: Creating orders on same day
     * Then: Both use their respective location codes
     */
    @Test
    void useSeparateSequencesForDifferentLocations() {
        LocalDate date = LocalDate.of(2026, 9, 27);
        String dateKey = "20260927";
        String loc1 = "PRAGATI-TG-001";
        String loc2 = "GEBBS-TG-005";

        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(loc1, dateKey))
                .thenReturn(Optional.empty());
        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(loc2, dateKey))
                .thenReturn(Optional.empty());

        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(1L);
                    return arg;
                });

        String order1 = generator.generateOrderNumber(loc1, date);
        String order2 = generator.generateOrderNumber(loc2, date);

        assertThat(order1).isEqualTo("PRAGATI-TG-001-20260927-0001");
        assertThat(order2).isEqualTo("GEBBS-TG-005-20260927-0001");
    }

    /**
     * TEST 3: Legacy format fallback (BB-only)
     *
     * Given: No location code provided (null)
     * When: Generating order number
     * Then: Uses legacy BB-YYYYMMDD-XXXX format
     */
    @Test
    void fallsBackToLegacyFormatWhenNoLocationCode() {
        LocalDate date = LocalDate.of(2026, 9, 27);
        String dateKey = "20260927";

        // Setup for legacy sequence (location_code IS NULL)
        when(sequenceRepository.findByDateKeyWithLock(dateKey))
                .thenReturn(Optional.empty());
        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(100L);
                    return arg;
                });

        String orderNumber = generator.generateOrderNumber((String) null, date);

        assertThat(orderNumber).isEqualTo("BB-20260927-0001");
    }

    /**
     * TEST 4: Empty string location code falls back to legacy
     */
    @Test
    void treatEmptyStringLocationCodeAsLegacy() {
        LocalDate date = LocalDate.of(2026, 9, 27);
        String dateKey = "20260927";

        when(sequenceRepository.findByDateKeyWithLock(dateKey))
                .thenReturn(Optional.empty());
        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(100L);
                    return arg;
                });

        String orderNumber = generator.generateOrderNumber("", date);

        assertThat(orderNumber).isEqualTo("BB-20260927-0001");
    }

    /**
     * TEST 5: Rejects null date
     */
    @Test
    void rejectsNullDate() {
        assertThatThrownBy(() -> generator.generateOrderNumber("PRAGATI-TG-001", (LocalDate) null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("localDate cannot be null");
    }

    /**
     * TEST 6: Uses exact location code (no transformation)
     *
     * Verify that location code is used as-is without any transformation.
     */
    @Test
    void usesExactLocationCodeWithoutTransformation() {
        LocalDate date = LocalDate.of(2026, 9, 27);
        String locationCode = "GEBBS-TG-005";  // Exact code with specific formatting
        String dateKey = "20260927";

        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(locationCode, dateKey))
                .thenReturn(Optional.empty());
        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(1L);
                    return arg;
                });

        String orderNumber = generator.generateOrderNumber(locationCode, date);

        // Verify exact location code is in the order number
        assertThat(orderNumber).startsWith("GEBBS-TG-005-");
        assertThat(orderNumber).isEqualTo("GEBBS-TG-005-20260927-0001");
    }

    /**
     * TEST 7: Different dates use independent sequences
     */
    @Test
    void usesIndependentSequencesForDifferentDates() {
        String locationCode = "PRAGATI-TG-001";
        LocalDate date1 = LocalDate.of(2026, 9, 27);
        LocalDate date2 = LocalDate.of(2026, 9, 28);
        String dateKey1 = "20260927";
        String dateKey2 = "20260928";

        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(locationCode, dateKey1))
                .thenReturn(Optional.empty());
        when(sequenceRepository.findByLocationCodeAndDateKeyWithLock(locationCode, dateKey2))
                .thenReturn(Optional.empty());

        when(sequenceRepository.save(any(DailyOrderSequence.class)))
                .thenAnswer(inv -> {
                    DailyOrderSequence arg = inv.getArgument(0);
                    arg.setId(arg.getLocationCode() == null ? 100L : 1L);
                    return arg;
                });

        String order1 = generator.generateOrderNumber(locationCode, date1);
        String order2 = generator.generateOrderNumber(locationCode, date2);

        assertThat(order1).isEqualTo("PRAGATI-TG-001-20260927-0001");
        assertThat(order2).isEqualTo("PRAGATI-TG-001-20260928-0001");
    }
}
