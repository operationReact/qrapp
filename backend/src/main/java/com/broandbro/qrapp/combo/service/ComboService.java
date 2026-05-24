package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.broandbro.qrapp.enums.TimeSlot;

/**
 * Primary combo management service contract.
 */
public interface ComboService {

    ComboResponse createCombo(ComboCreateRequest request, String createdBy);

    ComboResponse updateCombo(Long id, ComboCreateRequest request, String updatedBy);

    ComboResponse getComboById(Long id);

    Page<ComboCardResponse> listCombos(
            String search, Long categoryId, Boolean isActive,
            Boolean isFeatured, Boolean isPreorder, TimeSlot timeSlot,
            Pageable pageable);

    ComboResponse updateStatus(Long id, ComboStatusUpdateRequest request, String updatedBy);

    void deleteCombo(Long id, String deletedBy);

    ComboAnalyticsSummaryResponse getAnalyticsSummary();
}

