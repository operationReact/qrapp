package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.AutoSuggestion;
import com.broandbro.qrapp.recommendation.entity.ItemRecommendation;
import com.broandbro.qrapp.recommendation.enums.SuggestionStatus;
import com.broandbro.qrapp.recommendation.repository.AutoSuggestionRepository;
import com.broandbro.qrapp.recommendation.repository.ItemRecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * L2 – Service for admin review of auto-generated co-occurrence suggestions.
 * When accepted, the suggestion is also promoted to a manual L1 recommendation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutoSuggestionService {

    private final AutoSuggestionRepository suggRepo;
    private final ItemRecommendationRepository recRepo;

    // ── Query ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AutoSuggestionResponse> getPending() {
        return toResponseList(suggRepo.findByStatusOrderByConfidenceDesc(SuggestionStatus.PENDING));
    }

    @Transactional(readOnly = true)
    public List<AutoSuggestionResponse> getAll() {
        return toResponseList(suggRepo.findAllWithItems());
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return suggRepo.countByStatus(SuggestionStatus.PENDING);
    }

    // ── Review ────────────────────────────────────────────────────────────────

    @Transactional
    public AutoSuggestionResponse review(Long id, String action, String actor) {
        AutoSuggestion s = suggRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Suggestion not found: " + id));

        SuggestionStatus newStatus = "ACCEPT".equalsIgnoreCase(action)
                ? SuggestionStatus.ACCEPTED : SuggestionStatus.REJECTED;
        s.setStatus(newStatus);
        s.setReviewedBy(actor);
        s.setReviewedAt(Instant.now());
        AutoSuggestion saved = suggRepo.save(s);

        if (newStatus == SuggestionStatus.ACCEPTED) {
            promoteToManual(s, actor);
        }

        return toResponse(saved);
    }

    @Transactional
    public void bulkReview(BulkReviewRequest req, String actor) {
        SuggestionStatus newStatus = "ACCEPT".equalsIgnoreCase(req.getAction())
                ? SuggestionStatus.ACCEPTED : SuggestionStatus.REJECTED;

        List<AutoSuggestion> suggestions = suggRepo.findAllById(req.getIds());
        suggestions.forEach(s -> {
            s.setStatus(newStatus);
            s.setReviewedBy(actor);
            s.setReviewedAt(Instant.now());
            if (newStatus == SuggestionStatus.ACCEPTED) {
                promoteToManual(s, actor);
            }
        });
        suggRepo.saveAll(suggestions);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void promoteToManual(AutoSuggestion s, String actor) {
        // Avoid duplicating existing manual recommendations
        if (recRepo.findBySourceItemIdAndTargetItemId(s.getItemA().getId(), s.getItemB().getId()).isPresent()) {
            return;
        }
        recRepo.save(ItemRecommendation.builder()
                .sourceItem(s.getItemA())
                .targetItem(s.getItemB())
                .displayOrder(0)
                .isActive(true)
                .createdBy(actor)
                .updatedBy(actor)
                .build());
    }

    private List<AutoSuggestionResponse> toResponseList(List<AutoSuggestion> list) {
        return list.stream().map(this::toResponse).toList();
    }

    private AutoSuggestionResponse toResponse(AutoSuggestion s) {
        return AutoSuggestionResponse.builder()
                .id(s.getId())
                .itemAId(s.getItemA().getId())
                .itemAName(s.getItemA().getName())
                .itemBId(s.getItemB().getId())
                .itemBName(s.getItemB().getName())
                .confidence(s.getConfidence())
                .coCount(s.getCoCount())
                .status(s.getStatus().name())
                .reviewedBy(s.getReviewedBy())
                .reviewedAt(s.getReviewedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}

