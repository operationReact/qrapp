import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { evaluateComboCart } from "@/services/comboCampaignService";

function useDebounced(value, delay = 500) {
  const [debounced, setDebounced] = useState(() => value);
  const timerRef = useRef(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), delay]);
  return debounced;
}

/**
 * Evaluates the current cart against all active BYOC campaigns.
 * Returns real-time progress (per-campaign) and the best applicable discount.
 *
 * @param {Array}   cart    - cart items from CartContext
 * @param {boolean} enabled - set false to skip evaluation
 */
export function useByocDiscount(cart, enabled = true) {
  const cartPayload = useMemo(() => {
    if (!cart || cart.length === 0) return null;
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      restaurantId: null,
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: 0,
      items: cart.map((i) => ({
        menuItemId: typeof i.id === "string" ? null : i.id, // skip combo_ prefixed items
        categoryId: i.categoryId ?? null,
        quantity: i.quantity,
        unitPrice: parseFloat(Number(i.price).toFixed(2)),
      })).filter((i) => i.menuItemId != null),
    };
  }, [cart]);

  const debouncedPayload = useDebounced(cartPayload, 400);

  const query = useQuery({
    queryKey: ["byoc-cart-eval", debouncedPayload],
    queryFn: () => evaluateComboCart(debouncedPayload),
    enabled: enabled && !!debouncedPayload && debouncedPayload.items.length > 0,
    staleTime: 0,
    retry: 1,
    // Silently fail — BYOC is value-add, not critical
    onError: (err) => console.debug("BYOC evaluation failed", err),
  });

  const evaluation = query.data;

  return {
    ...query,
    cartPayload: debouncedPayload,
    campaigns: evaluation?.campaigns ?? [],
    bestDiscountAmount: evaluation?.bestDiscountAmount ?? 0,
    bestCampaignId: evaluation?.bestCampaignId ?? null,
    bestCampaignName: evaluation?.bestCampaignName ?? null,
    hasDiscount: Number(evaluation?.bestDiscountAmount ?? 0) > 0,
  };
}

