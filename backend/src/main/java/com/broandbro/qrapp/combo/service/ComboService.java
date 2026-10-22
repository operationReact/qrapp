package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.ComboCardResponse;

import java.util.List;

/**
 * Customer-facing combo lookup. Admin combo management has been removed.
 */
public interface ComboService {

    /** Public-facing: returns only active, non-deleted combos ordered by displayPriority. */
    List<ComboCardResponse> getPublicCombos(Long locationId);
}
