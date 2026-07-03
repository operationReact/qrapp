import { useQuery } from "@tanstack/react-query";
import { getCheckoutPromotions } from "@/services/promotion-service";
import { useMemo, useState, useEffect, useRef } from "react";

/**
 * Debounces any value — returns the last value that was stable for `delay` ms.
 * Uses useRef internally so hook order never changes.
 */
function useDebounced(value, delay = 500) {
  const [debounced, setDebounced] = useState(() => value);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), delay]);   // stringify avoids false-triggers from new object refs

  return debounced;
}

/**
 * Fetches eligible + ineligible promotions for the current cart.
 * The API call is debounced — it fires 500 ms after the last cart change,
 * so rapid +/− taps don't fire a request per tap.
 *
 * @param {Array}   cart    - cart items from CartContext
 * @param {boolean} enabled - only run when cart has items and user is logged in
 */
export function useCheckoutPromotions(cart, enabled = true) {
  // Build the raw payload whenever cart changes
  const cartPayload = useMemo(() => {
    if (!cart || cart.length === 0) return null;
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      restaurantId: null,
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: 0,
      items: cart.map((i) => ({
        menuItemId: i.id,
        categoryId: i.categoryId ?? null,
        quantity: i.quantity,
        unitPrice: parseFloat(Number(i.price).toFixed(2)),
      })),
    };
  }, [cart]);

  // Only pass the payload to the query after 500 ms of cart silence
  const debouncedPayload = useDebounced(cartPayload, 500);

  const query = useQuery({
    queryKey: ["checkout-promotions", debouncedPayload],
    queryFn: () => getCheckoutPromotions(debouncedPayload),
    enabled: enabled && debouncedPayload !== null,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    onError: (err) => {
      // Silently fail — promotions are a value-add, not critical
      console.debug("Failed to load checkout promotions", err);
    },
  });

  return {
    ...query,
    cartPayload: debouncedPayload,
    eligiblePromotions:   query.data?.eligiblePromotions   ?? [],
    ineligiblePromotions: query.data?.ineligiblePromotions ?? [],
    recommendedPromotion: query.data?.recommendedPromotion ?? null,
    totalEligibleCount:   query.data?.totalEligibleCount   ?? 0,
  };
}
