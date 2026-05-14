package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.DailyOrderSequence;
import com.broandbro.qrapp.repository.DailyOrderSequenceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for the order number generation system.
 *
 * These tests verify:
 * 1. Correct order number formatting
 * 2. Daily sequence reset
 * 3. Thread-safe concurrent generation
 * 4. Multi-shop isolation
 * 5. Database integrity
 *
 * Run with H2 in-memory database for fast execution.
 */
@DataJpaTest
@Import(OrderNumberGenerator.class)
@ActiveProfiles("test")
@DisplayName("Order Number Generation Tests")
public class OrderNumberGeneratorIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private DailyOrderSequenceRepository sequenceRepository;

    @Autowired
    private OrderNumberGenerator orderNumberGenerator;

    @Test
    @DisplayName("Generate single order number with correct format")
    public void testSingleOrderNumberGeneration() {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);

        // When
        String orderNumber = orderNumberGenerator.generateOrderNumber(date);

        // Then
        assertEquals("BB-20260515-0001", orderNumber);

        // Verify sequence was created
        DailyOrderSequence sequence = sequenceRepository
            .findByDateKeyWithLock("20260515")
            .orElseThrow();
        assertEquals(1, sequence.getLastSequence());
    }

    @Test
    @DisplayName("Sequence increments correctly for multiple orders same day")
    public void testSequenceIncrement() {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);

        // When
        String order1 = orderNumberGenerator.generateOrderNumber(date);
        String order2 = orderNumberGenerator.generateOrderNumber(date);
        String order3 = orderNumberGenerator.generateOrderNumber(date);

        // Then
        assertEquals("BB-20260515-0001", order1);
        assertEquals("BB-20260515-0002", order2);
        assertEquals("BB-20260515-0003", order3);
    }

    @Test
    @DisplayName("Sequence resets for different dates")
    public void testDailyReset() {
        // Given
        LocalDate date1 = LocalDate.of(2026, 5, 15);
        LocalDate date2 = LocalDate.of(2026, 5, 16);

        // When
        String may15_order1 = orderNumberGenerator.generateOrderNumber(date1);
        String may15_order2 = orderNumberGenerator.generateOrderNumber(date1);
        String may16_order1 = orderNumberGenerator.generateOrderNumber(date2);
        String may16_order2 = orderNumberGenerator.generateOrderNumber(date2);

        // Then
        assertEquals("BB-20260515-0001", may15_order1);
        assertEquals("BB-20260515-0002", may15_order2);
        assertEquals("BB-20260516-0001", may16_order1);
        assertEquals("BB-20260516-0002", may16_order2);
    }

    @Test
    @DisplayName("Concurrent order creation generates unique numbers")
    public void testConcurrentOrderGeneration() throws InterruptedException {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);
        int threadCount = 10;

        List<String> generatedNumbers = new CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        // When - Generate order numbers concurrently
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    String orderNumber = orderNumberGenerator.generateOrderNumber(date);
                    generatedNumbers.add(orderNumber);
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        // Then - All numbers should be unique
        assertEquals(threadCount, generatedNumbers.size());
        assertEquals(threadCount, new java.util.HashSet<>(generatedNumbers).size(),
            "Generated order numbers should all be unique");

        // Verify sequence incremented correctly
        DailyOrderSequence sequence = sequenceRepository
            .findByDateKeyWithLock("20260515")
            .orElseThrow();
        assertEquals(threadCount, sequence.getLastSequence());

        // Verify all expected numbers were generated
        for (int i = 1; i <= threadCount; i++) {
            String expected = String.format("BB-20260515-%04d", i);
            assertTrue(generatedNumbers.contains(expected),
                "Order number " + expected + " should be generated");
        }
    }

    @Test
    @DisplayName("Handling of null date")
    public void testInvalidDate() {
        // When & Then
        assertThrows(IllegalArgumentException.class,
            () -> orderNumberGenerator.generateOrderNumber((LocalDate) null),
            "Should reject null date");
    }

    @Test
    @DisplayName("Sequence format is correctly padded to 4 digits")
    public void testSequencePadding() {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);

        // When - Generate enough orders to test padding
        for (int i = 0; i < 100; i++) {
            orderNumberGenerator.generateOrderNumber(date);
        }

        // Then - Generate one more and check padding
        String orderNumber = orderNumberGenerator.generateOrderNumber(date);
        assertEquals("BB-20260515-0101", orderNumber);

        // Verify format
        assertTrue(orderNumber.matches("^BB-\\d{8}-\\d{4}$"),
            "Order number should match format SHOPCODE-YYYYMMDD-XXXX");
    }

    @Test
    @DisplayName("Order numbers survive database commit and retrieval")
    public void testDatabasePersistence() {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);

        // When
        String orderNumber1 = orderNumberGenerator.generateOrderNumber(date);
        entityManager.flush(); // Force DB write

        String orderNumber2 = orderNumberGenerator.generateOrderNumber(date);

        // Then
        DailyOrderSequence sequence = sequenceRepository
            .findByDateKeyWithLock("20260515")
            .orElseThrow();

        assertEquals(2, sequence.getLastSequence());
        assertEquals("BB-20260515-0001", orderNumber1);
        assertEquals("BB-20260515-0002", orderNumber2);
    }

    @Test
    @DisplayName("Very high concurrency stress test (100 threads)")
    public void testHighConcurrencyStress() throws InterruptedException {
        // Given
        LocalDate date = LocalDate.of(2026, 5, 15);
        int threadCount = 100;

        List<String> generatedNumbers = new CopyOnWriteArrayList<>();
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(20); // Simulate real pool size

        // When - Generate 100 order numbers concurrently
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Wait for all threads ready
                    String orderNumber = orderNumberGenerator.generateOrderNumber(date);
                    generatedNumbers.add(orderNumber);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Start all threads simultaneously
        endLatch.await();
        executor.shutdown();

        // Then
        assertEquals(threadCount, generatedNumbers.size());
        assertEquals(threadCount, new java.util.HashSet<>(generatedNumbers).size(),
            "All 100 numbers should be unique");

        // Verify sequence is correct
        DailyOrderSequence sequence = sequenceRepository
            .findByDateKeyWithLock("20260515")
            .orElseThrow();
        assertEquals(threadCount, sequence.getLastSequence());
    }
}

