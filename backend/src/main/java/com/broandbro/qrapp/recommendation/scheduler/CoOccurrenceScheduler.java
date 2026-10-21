package com.broandbro.qrapp.recommendation.scheduler;

import com.broandbro.qrapp.recommendation.entity.AutoSuggestion;
import com.broandbro.qrapp.recommendation.enums.SuggestionStatus;
import com.broandbro.qrapp.recommendation.repository.AutoSuggestionRepository;
import com.broandbro.qrapp.recommendation.repository.CoOccurrenceStatRepository;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Nightly job that:
 * <ol>
 *   <li>Queries order_item for co-purchased pairs over the last 90 days.</li>
 *   <li>Computes confidence (P(B|A)) and lift for each pair.</li>
 *   <li>Upserts into rec_co_occurrence_stat.</li>
 *   <li>Creates PENDING auto-suggestion rows for strong pairs (conf ≥ 0.25, co_count ≥ 5)
 *       that haven't already been reviewed.</li>
 * </ol>
 *
 * <p>Nothing goes live automatically — admin must Accept each suggestion.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CoOccurrenceScheduler {

    private final CoOccurrenceStatRepository coOccRepo;
    private final AutoSuggestionRepository autoSuggRepo;
    private final SchedulerRunRecorder runRecorder;

    @PersistenceContext
    private EntityManager em;

    // Thresholds (could be externalised to application.yml later)
    private static final BigDecimal MIN_CONFIDENCE  = new BigDecimal("0.25");
    private static final int        MIN_CO_COUNT    = 5;
    private static final int        LOOKBACK_DAYS   = 90;

    // ── Scheduled entry point ────────────────────────────────────────────────

    @Scheduled(cron = "${recommendation.cron.co-occurrence:0 30 1 * * *}",
               zone  = "Asia/Kolkata")
    @Transactional
    public void runNightly() {
        runRecorder.runScheduled(SchedulerJobIds.CO_OCCURRENCE, () -> {
            log.info("[CoOccurrenceScheduler] Starting nightly co-occurrence computation");
            run();
        });
    }

    // ── Core logic (also callable manually) ──────────────────────────────────

    @Transactional
    public void run() {
        LocalDate since = BusinessTime.today().minusDays(LOOKBACK_DAYS);
        long startMs = System.currentTimeMillis();

        // Step 1: Fetch all order-item pairs within the lookback window via native SQL.
        //         We join order on the order_item table and use a self-join to get pairs.
        @SuppressWarnings("unchecked")
        List<Object[]> rawPairs = em.createNativeQuery("""
                SELECT a.item_id AS item_a,
                       b.item_id AS item_b,
                       COUNT(*)  AS co_count
                FROM   order_item a
                JOIN   order_item b
                       ON a.order_id = b.order_id AND a.item_id < b.item_id
                JOIN   orders o ON o.id = a.order_id
                WHERE  o.created_at >= :since
                GROUP  BY a.item_id, b.item_id
                HAVING COUNT(*) >= :minCoCount
                """)
                .setParameter("since", java.sql.Date.valueOf(since))
                .setParameter("minCoCount", MIN_CO_COUNT)
                .getResultList();

        if (rawPairs.isEmpty()) {
            log.info("[CoOccurrenceScheduler] No co-occurrence pairs found — skipping");
            return;
        }

        // Step 2: Compute item-level order counts (for confidence denominator)
        @SuppressWarnings("unchecked")
        List<Object[]> rawCounts = em.createNativeQuery("""
                SELECT oi.item_id, COUNT(DISTINCT oi.order_id) AS order_count
                FROM   order_item oi
                JOIN   orders o ON o.id = oi.order_id
                WHERE  o.created_at >= :since
                GROUP  BY oi.item_id
                """)
                .setParameter("since", java.sql.Date.valueOf(since))
                .getResultList();

        Map<Long, Integer> itemOrderCounts = new HashMap<>();
        for (Object[] row : rawCounts) {
            itemOrderCounts.put(toLong(row[0]), toInt(row[1]));
        }

        // Population size for lift: distinct orders in the lookback window (all locations).
        long totalOrders = toLong(em.createNativeQuery("""
                SELECT COUNT(DISTINCT oi.order_id)
                FROM   order_item oi
                JOIN   orders o ON o.id = oi.order_id
                WHERE  o.created_at >= :since
                """)
                .setParameter("since", java.sql.Date.valueOf(since))
                .getSingleResult());

        int upserted = 0, suggested = 0;

        // Step 3: Upsert co-occurrence stats and seed auto-suggestions
        for (Object[] row : rawPairs) {
            Long   itemA    = toLong(row[0]);
            Long   itemB    = toLong(row[1]);
            int    coCount  = toInt(row[2]);
            int    aCount   = itemOrderCounts.getOrDefault(itemA, coCount);
            int    bCount   = itemOrderCounts.getOrDefault(itemB, coCount);

            BigDecimal conf  = aCount > 0
                    ? BigDecimal.valueOf(coCount).divide(BigDecimal.valueOf(aCount), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal confB = bCount > 0
                    ? BigDecimal.valueOf(coCount).divide(BigDecimal.valueOf(bCount), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            // Lift = P(A∩B) / (P(A) * P(B))  — approximate using order counts
            BigDecimal lift = BigDecimal.ZERO;
            if (aCount > 0 && bCount > 0 && totalOrders > 0) {
                BigDecimal pAB = BigDecimal.valueOf(coCount).divide(BigDecimal.valueOf(totalOrders), 6, RoundingMode.HALF_UP);
                BigDecimal pA  = BigDecimal.valueOf(aCount) .divide(BigDecimal.valueOf(totalOrders), 6, RoundingMode.HALF_UP);
                BigDecimal pB  = BigDecimal.valueOf(bCount) .divide(BigDecimal.valueOf(totalOrders), 6, RoundingMode.HALF_UP);
                if (pA.compareTo(BigDecimal.ZERO) > 0 && pB.compareTo(BigDecimal.ZERO) > 0) {
                    lift = pAB.divide(pA.multiply(pB), 4, RoundingMode.HALF_UP);
                }
            }

            // Upsert A→B
            coOccRepo.upsert(itemA, itemB, coCount, aCount, conf, lift);
            // Upsert B→A (symmetric pair)
            coOccRepo.upsert(itemB, itemA, coCount, bCount, confB, lift);
            upserted += 2;

            // Seed auto-suggestion for A→B if above threshold and not already reviewed
            if (conf.compareTo(MIN_CONFIDENCE) >= 0) {
                seedSuggestion(itemA, itemB, conf, coCount);
                suggested++;
            }
            if (confB.compareTo(MIN_CONFIDENCE) >= 0) {
                seedSuggestion(itemB, itemA, confB, coCount);
                suggested++;
            }
        }

        long elapsed = System.currentTimeMillis() - startMs;
        log.info("[CoOccurrenceScheduler] Done. pairs={} upserted={} suggestions_seeded={} elapsed={}ms",
                rawPairs.size(), upserted, suggested, elapsed);
    }

    private void seedSuggestion(Long itemAId, Long itemBId, BigDecimal confidence, int coCount) {
        // Skip if already accepted or rejected — only create PENDING rows for new pairs
        boolean alreadyReviewed = autoSuggRepo.existsByItemAIdAndItemBIdAndStatusIn(
                itemAId, itemBId,
                List.of(SuggestionStatus.ACCEPTED, SuggestionStatus.REJECTED));
        if (alreadyReviewed) return;

        Optional<AutoSuggestion> existing = autoSuggRepo.findByItemAIdAndItemBId(itemAId, itemBId);
        if (existing.isPresent()) {
            // Update confidence on existing PENDING row
            AutoSuggestion s = existing.get();
            s.setConfidence(confidence);
            s.setCoCount(coCount);
            autoSuggRepo.save(s);
        } else {
            // Use entity manager reference to avoid full load — just set IDs
            com.broandbro.qrapp.entity.MenuItem itemA = em.getReference(
                    com.broandbro.qrapp.entity.MenuItem.class, itemAId);
            com.broandbro.qrapp.entity.MenuItem itemB = em.getReference(
                    com.broandbro.qrapp.entity.MenuItem.class, itemBId);
            autoSuggRepo.save(AutoSuggestion.builder()
                    .itemA(itemA)
                    .itemB(itemB)
                    .confidence(confidence)
                    .coCount(coCount)
                    .status(SuggestionStatus.PENDING)
                    .build());
        }
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private static Long toLong(Object o) {
        if (o instanceof Number n) return n.longValue();
        return Long.parseLong(o.toString());
    }

    private static int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        return Integer.parseInt(o.toString());
    }
}

