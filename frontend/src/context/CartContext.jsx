/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useLocation } from './LocationContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// ── localStorage helpers ──────────────────────────────────────────────────────
// Each location gets its own cart storage key to prevent cross-location leakage
function getLocationCartKey(locationId) {
  return locationId ? `bro_cart_${locationId}` : 'bro_cart';
}

function getLocationPromotionKey(locationId) {
  return locationId ? `bro_applied_promotion_${locationId}` : 'bro_applied_promotion';
}

function getLocationByocKey(locationId) {
  return locationId ? `bro_byoc_discount_${locationId}` : 'bro_byoc_discount';
}

function readLS(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // quota exceeded or private mode
  }
}

// Dev-only diagnostic logger — never logs full cart payloads, tokens, or PII.
function devLog(label, data) {
  if (import.meta.env.DEV) {
    console.debug(`[cart] ${label}`, data);
  }
}

// An item only belongs to the active cart if its own locationId (when present)
// matches the location the cart is currently scoped to. Legacy items without
// a locationId are treated as valid (pre-migration data) to avoid destroying
// existing carts on deploy.
function itemBelongsToLocation(item, locationId) {
  if (item?.locationId == null || locationId == null) return true;
  return String(item.locationId) === String(locationId);
}

export function CartProvider({ children }) {
  const { activeLocationId } = useLocation();

  // Initialize cart based on current location
  const [cart, setCart] = useState(() => {
    const key = getLocationCartKey(activeLocationId);
    return readLS(key, []);
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addCount, setAddCount] = useState(0);
  const [lastAdded, setLastAdded] = useState(null);
  const lastAddedTimerRef = useRef(null);
  const prevLocationIdRef = useRef(activeLocationId);
  // Tracks which location the in-memory cart/promotion/byoc state actually
  // belongs to. This is intentionally separate from `activeLocationId`:
  // during a location switch, the location-switch effect updates this ref
  // synchronously BEFORE the sync-to-localStorage effects run, so those
  // effects never write stale (previous-location) state into the new
  // location's storage key — see the two effects below for details.
  const cartLocationIdRef = useRef(activeLocationId);

  // Promotion state (location-specific)
  const [appliedPromotion, setAppliedPromotion] = useState(() => {
    const key = getLocationPromotionKey(activeLocationId);
    return readLS(key, null);
  });

  // BYOC discount state (location-specific)
  const [byocDiscount, setByocDiscount] = useState(() => {
    const key = getLocationByocKey(activeLocationId);
    return readLS(key, null);
  });

  // Handle location changes: replace in-memory cart state with the new
  // location's cart. This is the critical sync point — React state must
  // never keep rendering the previous location's items while the new
  // location is active. LocalStorage reads here are synchronous, so there's
  // no stale-async-response window to guard against.
  useEffect(() => {
    if (activeLocationId !== prevLocationIdRef.current) {
      const previousLocationId = prevLocationIdRef.current;
      prevLocationIdRef.current = activeLocationId;
      // Re-point the sync-effect target BEFORE scheduling the state updates
      // below. If this ran after setCart/etc., the sync effects (which run
      // in the same commit, before React applies these pending updates)
      // would still see the OLD cart/promo/byoc values and — if they also
      // depended on activeLocationId — would write that stale data into the
      // new location's localStorage key.
      cartLocationIdRef.current = activeLocationId;

      // Load cart for new location
      const newCartKey = getLocationCartKey(activeLocationId);
      let newCart = readLS(newCartKey, []);
      // Defensive: discard any item that doesn't actually belong to this
      // location (e.g. corrupted/legacy localStorage). Never silently move
      // an item to another location's cart.
      const validCart = Array.isArray(newCart)
        ? newCart.filter((i) => itemBelongsToLocation(i, activeLocationId))
        : [];
      if (Array.isArray(newCart) && validCart.length !== newCart.length) {
        devLog("CART LOAD discarded mismatched items", {
          requestedLocationId: activeLocationId,
          discardedCount: newCart.length - validCart.length,
        });
      }
      newCart = validCart;
      setCart(newCart);

      // Load promotion for new location
      const newPromotionKey = getLocationPromotionKey(activeLocationId);
      const newPromotion = readLS(newPromotionKey, null);
      setAppliedPromotion(newPromotion);

      // Load BYOC discount for new location
      const newByocKey = getLocationByocKey(activeLocationId);
      const newByoc = readLS(newByocKey, null);
      setByocDiscount(newByoc);

      devLog("LOCATION CHANGE", { previousLocationId, newLocationId: activeLocationId });
      devLog("CART LOAD", {
        requestedLocationId: activeLocationId,
        loadedCartLocationId: activeLocationId,
        itemCount: newCart.length,
      });
    }
  }, [activeLocationId]);

  // Sync cart to localStorage. Deliberately depends on `cart` only (NOT
  // activeLocationId) and writes to cartLocationIdRef.current — the location
  // the in-memory `cart` value actually belongs to. This avoids a stale-
  // closure race: if this effect also depended on activeLocationId, it would
  // run in the SAME commit as the location-switch effect above, using the
  // OLD `cart` closure value (the previous location's items) together with
  // the ALREADY-UPDATED activeLocationId — silently overwriting the new
  // location's persisted cart with the old location's data.
  useEffect(() => {
    const cartKey = getLocationCartKey(cartLocationIdRef.current);
    writeLS(cartKey, cart);
  }, [cart]);

  // Sync promotion to localStorage (same stale-closure protection as above)
  useEffect(() => {
    const promKey = getLocationPromotionKey(cartLocationIdRef.current);
    writeLS(promKey, appliedPromotion);
  }, [appliedPromotion]);

  // Sync BYOC to localStorage (same stale-closure protection as above)
  useEffect(() => {
    const byocKey = getLocationByocKey(cartLocationIdRef.current);
    writeLS(byocKey, byocDiscount);
  }, [byocDiscount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
    };
  }, []);

  const addItem = (item) => {
    // An item must belong to the currently active location. Reject (never
    // merge/relocate) if it doesn't — this prevents Location A's menu items
    // from ending up in Location B's cart via a stale render or race.
    if (!itemBelongsToLocation(item, activeLocationId)) {
      devLog("CART MUTATION rejected — location mismatch", {
        activeLocationId,
        itemLocationId: item?.locationId,
      });
      console.warn("Item belongs to a different location.");
      return { ok: false, reason: "LOCATION_MISMATCH" };
    }

    setCart(prevCart => {
      const existing = prevCart.find(i => i.id === item.id);
      if (existing) {
        return prevCart.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });

    // trigger badge pulse
    setAddCount(c => c + 1);

    // show toast text
    if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
    setLastAdded(item.name);
    lastAddedTimerRef.current = setTimeout(() => setLastAdded(null), 2000);
    return { ok: true };
  };

  const decreaseItem = (item) => {
    setCart(prevCart => {
      const existing = prevCart.find(i => i.id === item.id);
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        return prevCart.filter(i => i.id !== item.id);
      }
      return prevCart.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const removeItem = (id) => {
    setCart(prevCart => prevCart.filter(i => i.id !== id));
  };

  const clearCart = () => {
    const locationId = cartLocationIdRef.current;
    const cartKey = getLocationCartKey(locationId);
    const promKey = getLocationPromotionKey(locationId);
    const byocKey = getLocationByocKey(locationId);

    setCart([]);
    setAppliedPromotion(null);
    setByocDiscount(null);
    writeLS(cartKey, null);
    writeLS(promKey, null);
    writeLS(byocKey, null);
  };

  const applyPromotion = (promotion) => {
    setAppliedPromotion(promotion);
    setByocDiscount(null); // mutual exclusion — clear BYOC when promo applied
  };

  const removePromotion = () => {
    setAppliedPromotion(null);
  };

  const applyByocDiscount = ({ campaignId, campaignName, discountAmount }) => {
    if (!appliedPromotion) {
      setByocDiscount({ campaignId, campaignName, discountAmount });
    }
  };

  const removeByocDiscount = () => setByocDiscount(null);

  const getTotalAfterDiscount = () => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const promoDiscount = appliedPromotion?.actualDiscount ?? 0;
    const byocAmt = byocDiscount?.discountAmount ?? 0;
    const discount = Math.max(Number(promoDiscount), Number(byocAmt));
    return Math.max(0, subtotal - discount);
  };

  const getTotal = () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const toggleDrawer = () => setDrawerOpen(v => !v);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        decreaseItem,
        removeItem,
        clearCart,
        getTotal,
        getTotalAfterDiscount,
        drawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addCount,
        lastAdded,
        appliedPromotion,
        applyPromotion,
        removePromotion,
        byocDiscount,
        applyByocDiscount,
        removeByocDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

CartProvider.propTypes = {
  children: PropTypes.node,
};
