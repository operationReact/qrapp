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

  // Handle location changes: switch to location-specific cart
  useEffect(() => {
    if (activeLocationId !== prevLocationIdRef.current) {
      prevLocationIdRef.current = activeLocationId;
      // Load cart for new location
      const newCartKey = getLocationCartKey(activeLocationId);
      const newCart = readLS(newCartKey, []);
      setCart(newCart);

      // Load promotion for new location
      const newPromotionKey = getLocationPromotionKey(activeLocationId);
      const newPromotion = readLS(newPromotionKey, null);
      setAppliedPromotion(newPromotion);

      // Load BYOC discount for new location
      const newByocKey = getLocationByocKey(activeLocationId);
      const newByoc = readLS(newByocKey, null);
      setByocDiscount(newByoc);
    }
  }, [activeLocationId]);

  // Sync cart to localStorage (location-specific key)
  useEffect(() => {
    const cartKey = getLocationCartKey(activeLocationId);
    writeLS(cartKey, cart);
  }, [cart, activeLocationId]);

  // Sync promotion to localStorage (location-specific key)
  useEffect(() => {
    const promKey = getLocationPromotionKey(activeLocationId);
    writeLS(promKey, appliedPromotion);
  }, [appliedPromotion, activeLocationId]);

  // Sync BYOC to localStorage (location-specific key)
  useEffect(() => {
    const byocKey = getLocationByocKey(activeLocationId);
    writeLS(byocKey, byocDiscount);
  }, [byocDiscount, activeLocationId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
    };
  }, []);

  const addItem = (item) => {
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
    const cartKey = getLocationCartKey(activeLocationId);
    const promKey = getLocationPromotionKey(activeLocationId);
    const byocKey = getLocationByocKey(activeLocationId);

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
