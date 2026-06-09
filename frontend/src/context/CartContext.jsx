/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';
import { createContext, useContext, useState, useRef, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_CART       = "bro_cart";
const LS_PROMOTION  = "bro_applied_promotion";
const LS_BYOC       = "bro_byoc_discount";

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
    } catch { /* quota exceeded or private mode */ }
}

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => readLS(LS_CART, []));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [addCount, setAddCount] = useState(0);
    const [lastAdded, setLastAdded] = useState(null);
    const lastAddedTimerRef = useRef(null);

    // ── Promotion state ──────────────────────────────────────────────────────
    const [appliedPromotion, setAppliedPromotion] = useState(() => readLS(LS_PROMOTION, null));

    // ── BYOC discount state ───────────────────────────────────────────────────
    const [byocDiscount, setByocDiscount] = useState(() => readLS(LS_BYOC, null));

    // ── Sync to localStorage on every change ─────────────────────────────────
    useEffect(() => { writeLS(LS_CART, cart); }, [cart]);
    useEffect(() => { writeLS(LS_PROMOTION, appliedPromotion); }, [appliedPromotion]);
    useEffect(() => { writeLS(LS_BYOC, byocDiscount); }, [byocDiscount]);

    useEffect(() => {
        return () => {
            if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
        };
    }, []);

    const addItem = (item) => {
        const existing = cart.find(i => i.id === item.id);

        if (existing) {
            setCart(cart.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }

        // trigger badge pulse
        setAddCount(c => c + 1);

        // show toast text — clear any previous hide timer so each add gets its full duration
        if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
        setLastAdded(item.name);
        lastAddedTimerRef.current = setTimeout(() => setLastAdded(null), 2000); // 2 seconds auto-dismiss
    };

    const decreaseItem = (item) => {
        const existing = cart.find(i => i.id === item.id);
        if (!existing) return;

        if (existing.quantity === 1) {
            setCart(cart.filter(i => i.id !== item.id));
        } else {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
        }
    }

    const removeItem = (id) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setAppliedPromotion(null);
        setByocDiscount(null);
        writeLS(LS_CART, null);
        writeLS(LS_PROMOTION, null);
        writeLS(LS_BYOC, null);
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

    /** Total after promotion discount OR BYOC discount (whichever is applied) */
    const getTotalAfterDiscount = () => {
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const promoDiscount = appliedPromotion?.actualDiscount ?? 0;
        const byocAmt = byocDiscount?.discountAmount ?? 0;
        // Take the larger of the two (only one is active at a time)
        const discount = Math.max(Number(promoDiscount), Number(byocAmt));
        return Math.max(0, subtotal - discount);
    };

    const getTotal = () =>
        cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const openDrawer = () => setDrawerOpen(true);
    const closeDrawer = () => setDrawerOpen(false);
    const toggleDrawer = () => setDrawerOpen(v => !v);

    return (
        <CartContext.Provider value={{
            cart, addItem, decreaseItem, removeItem, clearCart,
            getTotal, getTotalAfterDiscount,
            drawerOpen, openDrawer, closeDrawer, toggleDrawer,
            addCount, lastAdded,
            appliedPromotion, applyPromotion, removePromotion,
            byocDiscount, applyByocDiscount, removeByocDiscount,
        }}>
            {children}
        </CartContext.Provider>
    );
}

CartProvider.propTypes = {
    children: PropTypes.node,
};
