package com.broandbro.qrapp.promotion.engine.scope;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.entity.PromotionScope;
import com.broandbro.qrapp.promotion.enums.ScopeType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class PromotionScopeFilter {

    /**
     * Empty scope list  → promotion applies to ALL carts (pass).
     * Non-empty list    → for each scope_type group, the cart must contain
     *                     at least one matching item (AND across types, OR within type).
     */
    public ScopeResult check(CartContext cart, List<PromotionScope> scopes) {
        if (scopes == null || scopes.isEmpty()) return ScopeResult.match();

        // Group scopes by type
        Map<ScopeType, Set<Long>> scopeMap = scopes.stream()
                .collect(Collectors.groupingBy(
                        PromotionScope::getScopeType,
                        Collectors.mapping(PromotionScope::getScopeId, Collectors.toSet())
                ));

        for (Map.Entry<ScopeType, Set<Long>> entry : scopeMap.entrySet()) {
            boolean anyMatch = switch (entry.getKey()) {
                case RESTAURANT -> entry.getValue().contains(cart.restaurantId());
                case CATEGORY   -> cart.items().stream()
                        .anyMatch(i -> entry.getValue().contains(i.categoryId()));
                case MENU_ITEM  -> cart.items().stream()
                        .anyMatch(i -> entry.getValue().contains(i.menuItemId()));
            };

            if (!anyMatch) {
                String reason = switch (entry.getKey()) {
                    case RESTAURANT -> "This promotion is valid only at specific restaurants";
                    case CATEGORY   -> "Add an item from the required category to use this promotion";
                    case MENU_ITEM  -> "Add the required item to your cart to use this promotion";
                };
                return ScopeResult.noMatch(reason);
            }
        }
        return ScopeResult.match();
    }
}

