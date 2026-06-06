/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';
import { createContext, useContext, useState, useRef, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [addCount, setAddCount] = useState(0); // used to trigger badge pulse
    const [lastAdded, setLastAdded] = useState(null);
    const lastAddedTimerRef = useRef(null);

    // ── Promotion state ──────────────────────────────────────────────────────
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    // Shape: { id, code, title, rewardDisplay, actualDiscount, isAutoApplied }

    // ── BYOC (Build Your Own Combo) discount state ────────────────────────────
    // Shape: { campaignId, campaignName, discountAmount }
    const [byocDiscount, setByocDiscount] = useState(null);

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
        setAppliedPromotion(null); // clear promotion when cart is cleared
        setByocDiscount(null);
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
