package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.User;

/** Who performed a manual invoice mutation, captured for the append-only audit trail. */
public record ManualInvoiceActor(Long userId, String name, String role) {
    public static ManualInvoiceActor of(User user) {
        if (user == null) {
            return new ManualInvoiceActor(null, "system", null);
        }
        String name = user.getName() == null || user.getName().isBlank()
                ? "user-" + user.getId() : user.getName().trim();
        return new ManualInvoiceActor(user.getId(), name, user.getRole() == null ? null : user.getRole().name());
    }
}
