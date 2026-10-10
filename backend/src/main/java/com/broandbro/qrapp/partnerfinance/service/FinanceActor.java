package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.User;

/** Who performed a finance mutation; the display name is what partners may see. */
public record FinanceActor(Long userId, String name, String role) {
    public static FinanceActor of(User user) {
        String name = user.getName() == null || user.getName().isBlank() ? "user-" + user.getId() : user.getName().trim();
        return new FinanceActor(user.getId(), name, user.getRole() == null ? null : user.getRole().name());
    }
}