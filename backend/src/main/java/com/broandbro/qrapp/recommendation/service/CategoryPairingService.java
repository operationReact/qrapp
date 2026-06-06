package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.CategoryPairingRule;
import com.broandbro.qrapp.recommendation.repository.CategoryPairingRuleRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * L5 – CRUD service for category-level fallback pairing rules.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryPairingService {

    private final CategoryPairingRuleRepository pairingRepo;
    private final CategoryRepository categoryRepo;

    // ── Query ─────────────────────────────────────────────────────────────────

    public List<CategoryPairingResponse> getAll() {
        return toResponseList(pairingRepo.findAll());
    }

    public List<CategoryPairingResponse> getActive() {
        return toResponseList(pairingRepo.findByIsActiveTrueOrderByDisplayOrderAsc());
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    @Transactional
    public CategoryPairingResponse create(CategoryPairingRequest req, String actor) {
        if (pairingRepo.existsBySourceCategoryIdAndTargetCategoryId(
                req.getSourceCategoryId(), req.getTargetCategoryId())) {
            throw new IllegalStateException("Category pairing already exists");
        }
        CategoryPairingRule rule = CategoryPairingRule.builder()
                .sourceCategory(categoryRepo.findById(req.getSourceCategoryId())
                        .orElseThrow(() -> new IllegalArgumentException("Source category not found")))
                .targetCategory(categoryRepo.findById(req.getTargetCategoryId())
                        .orElseThrow(() -> new IllegalArgumentException("Target category not found")))
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .isActive(true)
                .createdBy(actor)
                .build();
        return toResponse(pairingRepo.save(rule));
    }

    @Transactional
    public void delete(Long id) {
        pairingRepo.deleteById(id);
    }

    @Transactional
    public CategoryPairingResponse toggle(Long id) {
        CategoryPairingRule rule = pairingRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category pairing not found: " + id));
        rule.setIsActive(!rule.getIsActive());
        return toResponse(pairingRepo.save(rule));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<CategoryPairingResponse> toResponseList(List<CategoryPairingRule> list) {
        return list.stream().map(this::toResponse).toList();
    }

    private CategoryPairingResponse toResponse(CategoryPairingRule r) {
        return CategoryPairingResponse.builder()
                .id(r.getId())
                .sourceCategoryId(r.getSourceCategory().getId())
                .sourceCategoryName(r.getSourceCategory().getName())
                .targetCategoryId(r.getTargetCategory().getId())
                .targetCategoryName(r.getTargetCategory().getName())
                .displayOrder(r.getDisplayOrder())
                .isActive(r.getIsActive())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

