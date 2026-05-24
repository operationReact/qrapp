package com.broandbro.qrapp.combo.dto;

public record ComboItemResponse(
        Long id,
        Long menuItemId,
        String menuItemName,
        String categoryName,
        Boolean isVeg,
        int quantity,
        int sortOrder
) {}

