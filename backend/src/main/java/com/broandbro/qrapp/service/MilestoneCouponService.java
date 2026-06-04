package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Coupon;
import com.broandbro.qrapp.entity.MilestoneConfig;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserMilestone;
import com.broandbro.qrapp.enums.DiscountType;
import com.broandbro.qrapp.repository.CouponRepository;
import com.broandbro.qrapp.repository.MilestoneConfigRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.repository.UserMilestoneRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MilestoneCouponService {

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final UserMilestoneRepository milestoneRepository;
    private final MilestoneConfigRepository milestoneConfigRepository;

    // ── Default seed data (used only if table is empty) ─────────────────────

    private static final List<MilestoneConfig> DEFAULTS = List.of(
        MilestoneConfig.builder().thresholdAmount(new BigDecimal("500"))
            .discountPct(new BigDecimal("5")).maxCap(new BigDecimal("50")).validityDays(30).isActive(true).build(),
        MilestoneConfig.builder().thresholdAmount(new BigDecimal("1000"))
            .discountPct(new BigDecimal("8")).maxCap(new BigDecimal("100")).validityDays(30).isActive(true).build(),
        MilestoneConfig.builder().thresholdAmount(new BigDecimal("2500"))
            .discountPct(new BigDecimal("10")).maxCap(new BigDecimal("150")).validityDays(45).isActive(true).build(),
        MilestoneConfig.builder().thresholdAmount(new BigDecimal("5000"))
            .discountPct(new BigDecimal("12")).maxCap(new BigDecimal("200")).validityDays(45).isActive(true).build(),
        MilestoneConfig.builder().thresholdAmount(new BigDecimal("10000"))
            .discountPct(new BigDecimal("15")).maxCap(new BigDecimal("300")).validityDays(60).isActive(true).build()
    );

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        if (milestoneConfigRepository.count() == 0) {
            milestoneConfigRepository.saveAll(DEFAULTS);
            log.info("Seeded {} default milestone configs", DEFAULTS.size());
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Called after an order is saved.
     * Runs in its own transaction so a failure here never rolls back the order.
     *
     * @return list of newly issued coupon codes (empty if none)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<String> checkAndAwardMilestones(User user, BigDecimal orderGrandTotal) {
        if (user == null || user.getId() == null) return List.of();
        try {
            // Current lifetime spend INCLUDING this order (already committed to DB)
            BigDecimal lifetimeSpend = orderRepository.sumLifetimeSpendByUserId(user.getId());
            // If the order isn't COMPLETED yet (just placed), add grandTotal manually
            if (lifetimeSpend == null) lifetimeSpend = BigDecimal.ZERO;
            // Add the just-placed order's value (status may still be ORDER_PLACED)
            BigDecimal effectiveSpend = lifetimeSpend.add(orderGrandTotal);

            List<MilestoneConfig> configs = milestoneConfigRepository.findAllByIsActiveTrueOrderByThresholdAmountAsc();
            List<String> awarded = new ArrayList<>();

            for (MilestoneConfig cfg : configs) {
                if (effectiveSpend.compareTo(cfg.getThresholdAmount()) >= 0
                        && !milestoneRepository.existsByUserIdAndMilestoneAmount(user.getId(), cfg.getThresholdAmount())) {

                    String code = buildCouponCode(user.getName(), cfg.getThresholdAmount());
                    // Ensure uniqueness — append user id suffix if code already exists
                    if (couponRepository.findByCode(code).isPresent()) {
                        code = code + user.getId();
                    }

                    Coupon coupon = Coupon.builder()
                        .code(code)
                        .title("₹" + cfg.getThresholdAmount().toPlainString() + " Milestone Reward 🎉")
                        .description("You've spent ₹" + cfg.getThresholdAmount().toPlainString()
                            + " with us! Enjoy " + cfg.getDiscountPct().toPlainString()
                            + "% off your next order (max ₹" + cfg.getMaxCap().toPlainString() + ").")
                        .discountType(DiscountType.PERCENTAGE)
                        .discountValue(cfg.getDiscountPct())
                        .maxDiscountAmount(cfg.getMaxCap())
                        .totalUsageLimit(1)
                        .perUserLimit(1)
                        .isFirstOrderOnly(false)
                        .isActive(true)
                        .createdBy("SYSTEM_MILESTONE")
                        .updatedBy("SYSTEM_MILESTONE")
                        .expiresAt(LocalDateTime.now().plusDays(cfg.getValidityDays()))
                        .build();

                    couponRepository.save(coupon);
                    milestoneRepository.save(UserMilestone.builder()
                        .userId(user.getId())
                        .milestoneAmount(cfg.getThresholdAmount())
                        .couponCode(code)
                        .lifetimeSpendAtAward(effectiveSpend)
                        .build());

                    awarded.add(code);
                    log.info("Milestone coupon issued: user={} milestone={} code={}", user.getId(), cfg.getThresholdAmount(), code);
                }
            }
            return awarded;
        } catch (Exception e) {
            log.error("Failed to check/award milestones for user {}", user.getId(), e);
            return List.of();
        }
    }

    /**
     * Returns all milestone coupons ever issued to a user, enriched with
     * expiry/discount info from the live Coupon record.
     */
    @Transactional(readOnly = true)
    public List<MilestoneCouponInfo> getUserMilestoneCoupons(Long userId) {
        return milestoneRepository.findAllByUserIdOrderByMilestoneAmountAsc(userId).stream()
            .map(m -> {
                Coupon c = couponRepository.findByCode(m.getCouponCode()).orElse(null);
                return new MilestoneCouponInfo(
                    m.getMilestoneAmount(),
                    m.getCouponCode(),
                    m.getAwardedAt(),
                    c != null ? c.getDiscountValue() : null,
                    c != null ? c.getMaxDiscountAmount() : null,
                    c != null ? c.getExpiresAt() : null,
                    c != null && Boolean.TRUE.equals(c.getIsActive())
                        && (c.getExpiresAt() == null || c.getExpiresAt().isAfter(LocalDateTime.now()))
                );
            })
            .toList();
    }

    // ── Admin CRUD (delegated from controller) ────────────────────────────────

    @Transactional(readOnly = true)
    public List<MilestoneConfig> getAllConfigs() {
        return milestoneConfigRepository.findAllByOrderByThresholdAmountAsc();
    }

    @Transactional
    public MilestoneConfig createConfig(MilestoneConfig req) {
        if (milestoneConfigRepository.existsByThresholdAmount(req.getThresholdAmount())) {
            throw new IllegalArgumentException("Milestone for ₹" + req.getThresholdAmount() + " already exists");
        }
        return milestoneConfigRepository.save(req);
    }

    @Transactional
    public MilestoneConfig updateConfig(Long id, MilestoneConfig req) {
        MilestoneConfig existing = milestoneConfigRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Milestone config not found: " + id));
        // If threshold changed, ensure no duplicate
        if (existing.getThresholdAmount().compareTo(req.getThresholdAmount()) != 0
                && milestoneConfigRepository.existsByThresholdAmount(req.getThresholdAmount())) {
            throw new IllegalArgumentException("Milestone for ₹" + req.getThresholdAmount() + " already exists");
        }
        existing.setThresholdAmount(req.getThresholdAmount());
        existing.setDiscountPct(req.getDiscountPct());
        existing.setMaxCap(req.getMaxCap());
        existing.setValidityDays(req.getValidityDays());
        existing.setIsActive(req.getIsActive());
        return milestoneConfigRepository.save(existing);
    }

    @Transactional
    public void deleteConfig(Long id) {
        if (!milestoneConfigRepository.existsById(id)) {
            throw new IllegalArgumentException("Milestone config not found: " + id);
        }
        milestoneConfigRepository.deleteById(id);
    }

    @Transactional
    public MilestoneConfig toggleConfig(Long id) {
        MilestoneConfig cfg = milestoneConfigRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Milestone config not found: " + id));
        cfg.setIsActive(!Boolean.TRUE.equals(cfg.getIsActive()));
        return milestoneConfigRepository.save(cfg);
    }

    // ── Records ───────────────────────────────────────────────────────────────

    public record MilestoneCouponInfo(
        BigDecimal milestoneAmount,
        String couponCode,
        LocalDateTime awardedAt,
        BigDecimal discountPct,
        BigDecimal maxCap,
        LocalDateTime expiresAt,
        boolean isValid
    ) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    static String buildCouponCode(String name, BigDecimal milestone) {
        String prefix = "USER";
        if (name != null && !name.isBlank()) {
            String normalised = Normalizer.normalize(name.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z]", "")
                .toUpperCase();
            if (!normalised.isEmpty()) {
                prefix = normalised.substring(0, Math.min(6, normalised.length()));
            }
        }
        return prefix + milestone.toBigInteger();
    }
}
