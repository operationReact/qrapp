package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.broandbro.qrapp.enums.TimeSlot;
import java.util.List;

/**
 * Primary combo management service contract.
 */
public interface ComboService {

    ComboResponse createCombo(ComboCreateRequest request, String createdBy, Long locationId);

    ComboResponse updateCombo(Long id, ComboCreateRequest request, String updatedBy, Long locationId);

    ComboResponse getComboById(Long id, Long locationId);

    Page<ComboCardResponse> listCombos(
            String search, Long categoryId, Boolean isActive,
            Boolean isFeatured, Boolean isPreorder, TimeSlot timeSlot,
            Pageable pageable, Long locationId);

    /** Public-facing: returns only active, non-deleted combos ordered by displayPriority. */
    List<ComboCardResponse> getPublicCombos();

    ComboResponse updateStatus(Long id, ComboStatusUpdateRequest request, String updatedBy, Long locationId);

    void deleteCombo(Long id, String deletedBy, Long locationId);

    ComboAnalyticsSummaryResponse getAnalyticsSummary();
}
