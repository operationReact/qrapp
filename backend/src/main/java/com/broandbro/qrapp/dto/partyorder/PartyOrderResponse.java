package com.broandbro.qrapp.dto.partyorder;

import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.PartyOrderMenuItem;
import com.broandbro.qrapp.enums.PartyOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Shared response DTO. Admin and user views are kept separate to hide internal profit data.
 * Use {@link #forUser(PartyOrder)} or {@link #forAdmin(PartyOrder)} factory methods.
 */
public record PartyOrderResponse(
        Long id,
        Long userId,
        // PII — only in admin responses
        String userPhone,
        String userName,
        LocalDateTime eventDateTime,
        Integer numberOfPeople,
        List<String> menuItems,
        /** Per-item estimate details — admin only */
        List<MenuItemDetail> menuItemDetails,
        String venue,
        String eventType,
        String specialNotes,
        BigDecimal budgetAmount,
        PartyOrderStatus status,
        // Financial — totals visible to user (total amount only), full breakdown admin only
        BigDecimal estimatedTotalAmount,
        /** Admin only */
        BigDecimal estimatedTotalExpense,
        /** Admin only */
        BigDecimal estimatedTotalProfit,
        /** Legacy field — same as estimatedTotalAmount if items exist */
        BigDecimal estimatedAmount,
        String currency,
        String estimateNote,
        /** Admin only */
        String adminNotes,
        String estimateSubmittedBy,
        Instant estimateSentAt,
        Instant estimateExpiresAt,
        BigDecimal advanceRequiredAmount,
        BigDecimal advancePaidAmount,
        Boolean advancePaid,
        Instant advancePaidAt,
        Instant confirmationStartedAt,
        Boolean eventCountdownStarted,
        Boolean callbackRequested,
        Instant userRespondedAt,
        // ── Balance (post-delivery) ──
        BigDecimal balanceAmount,
        Boolean balancePaid,
        BigDecimal balancePaidAmount,
        Instant balancePaidAt,
        Instant deliveredAt,
        Instant createdAt,
        Instant updatedAt
) {

    /** Per-item detail record embedded in response. */
    public record MenuItemDetail(
            Long id,
            String itemName,
            String notes,
            BigDecimal quotedPrice,
            /** Admin only */
            BigDecimal estimatedCost,
            /** Admin only */
            BigDecimal estimatedProfit
    ) {}

    private static List<String> extractMenuItemNames(PartyOrder po) {
        if (po.getMenuItems() != null && !po.getMenuItems().isEmpty()) {
            return po.getMenuItems().stream().map(PartyOrderMenuItem::getItemName).toList();
        }
        if (po.getMenuDescription() != null && !po.getMenuDescription().isBlank()) {
            return List.of(po.getMenuDescription().split(","))
                    .stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
        return List.of();
    }

    private static List<MenuItemDetail> extractAdminMenuItemDetails(PartyOrder po) {
        if (po.getMenuItems() == null) return List.of();
        return po.getMenuItems().stream()
                .map(item -> new MenuItemDetail(
                        item.getId(), item.getItemName(), item.getNotes(),
                        item.getQuotedPrice(), item.getEstimatedCost(), item.getEstimatedProfit()))
                .toList();
    }

    private static List<MenuItemDetail> extractUserMenuItemDetails(PartyOrder po) {
        // Users see item names and quoted price only — no cost/profit
        if (po.getMenuItems() == null) return List.of();
        return po.getMenuItems().stream()
                .filter(item -> item.getQuotedPrice() != null)
                .map(item -> new MenuItemDetail(
                        item.getId(), item.getItemName(), null,
                        item.getQuotedPrice(), null, null))
                .toList();
    }

    /** Build for user-facing responses — strips internal profit/cost/adminNotes/PII. */
    public static PartyOrderResponse forUser(PartyOrder po) {
        BigDecimal totalAmount = po.getEstimatedTotalAmount() != null
                ? po.getEstimatedTotalAmount() : po.getEstimatedAmount();
        return new PartyOrderResponse(
                po.getId(), po.getUserId(), null, null,
                po.getEventDateTime(), po.getNumberOfPeople(),
                extractMenuItemNames(po), extractUserMenuItemDetails(po),
                po.getVenue(), po.getEventType(), po.getSpecialNotes(), po.getBudgetAmount(),
                po.getStatus(),
                totalAmount, null, null, po.getEstimatedAmount(),
                po.getCurrency(), po.getEstimateNote(), null,
                po.getEstimateSubmittedBy(), po.getEstimateSentAt(), po.getEstimateExpiresAt(),
                po.getAdvanceRequiredAmount(), po.getAdvancePaidAmount(),
                po.getAdvancePaid(), po.getAdvancePaidAt(),
                po.getConfirmationStartedAt(), po.getEventCountdownStarted(),
                po.getCallbackRequested(), po.getUserRespondedAt(),
                po.getBalanceAmount(), po.getBalancePaid(), po.getBalancePaidAmount(),
                po.getBalancePaidAt(), po.getDeliveredAt(),
                po.getCreatedAt(), po.getUpdatedAt()
        );
    }

    /** Build for admin responses — includes full financial data, PII, and adminNotes. */
    public static PartyOrderResponse forAdmin(PartyOrder po) {
        return new PartyOrderResponse(
                po.getId(), po.getUserId(), po.getUserPhone(), po.getUserName(),
                po.getEventDateTime(), po.getNumberOfPeople(),
                extractMenuItemNames(po), extractAdminMenuItemDetails(po),
                po.getVenue(), po.getEventType(), po.getSpecialNotes(), po.getBudgetAmount(),
                po.getStatus(),
                po.getEstimatedTotalAmount(), po.getEstimatedTotalExpense(), po.getEstimatedTotalProfit(),
                po.getEstimatedAmount(),
                po.getCurrency(), po.getEstimateNote(), po.getAdminNotes(),
                po.getEstimateSubmittedBy(), po.getEstimateSentAt(), po.getEstimateExpiresAt(),
                po.getAdvanceRequiredAmount(), po.getAdvancePaidAmount(),
                po.getAdvancePaid(), po.getAdvancePaidAt(),
                po.getConfirmationStartedAt(), po.getEventCountdownStarted(),
                po.getCallbackRequested(), po.getUserRespondedAt(),
                po.getBalanceAmount(), po.getBalancePaid(), po.getBalancePaidAmount(),
                po.getBalancePaidAt(), po.getDeliveredAt(),
                po.getCreatedAt(), po.getUpdatedAt()
        );
    }
}
