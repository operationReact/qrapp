import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useUserAuth } from "../context/UserAuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useEffect, useState } from 'react';
import { walletGetBalance, getCachedWalletBalance } from '../services/api';

export default function Navbar() {
    const { cart, openDrawer, closeDrawer } = useCart();
    const { user, setUser } = useUserAuth();
    const { admin } = useAdminAuth();
    const [walletBalance, setWalletBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        async function fetchBalance() {
            if (!user || !user.token) { setWalletBalance(null); return; }
            setLoadingBalance(true);
            try {
                const cached = getCachedWalletBalance();
                if (cached) { if (!mounted) return; setWalletBalance(cached.balance ?? 0); }
                else { const resp = await walletGetBalance(); if (!mounted) return; setWalletBalance(resp?.data?.balance ?? 0); }
            } catch (e) { console.error('Failed to load wallet balance', e); if (mounted) setWalletBalance(null); }
            finally { if (mounted) setLoadingBalance(false); }
        }
        fetchBalance();
        return () => { mounted = false; };
    }, [user]);

    return (
        <header className="sticky top-0 z-50 bg-white shadow-header backdrop-blur-sm">
            <div className="container-premium flex items-center justify-between py-3">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">🍽</div>
                    <div className="text-sm font-bold text-amber-700">Bro & Bro</div>
                </Link>

                <div className="flex items-center gap-3">
                    {!admin && user && (
                        <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500 text-white font-semibold shadow-md">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="#fff2cc" stroke="#f59e0b" strokeWidth="1"/></svg>
                            <span className="text-xs sm:text-sm">{loadingBalance ? '...' : `₹ ${(walletBalance/100).toFixed(2)}`}</span>
                        </Link>
                    )}

                    <button onClick={() => {
                        // On small screens open the off-canvas drawer; on larger screens navigate to cart page
                        if (window.innerWidth < 768) {
                            openDrawer();
                        } else {
                            // ensure drawer is closed to avoid both showing
                            closeDrawer();
                            navigate('/cart');
                        }
                    }} aria-label="Open cart" className="relative p-2 bg-red-500 text-white rounded-lg shadow-md">
                        <ShoppingCartIcon className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-white text-red-500 text-xs px-2 rounded-full">{cart.length}</span>
                    </button>

                    {!admin && !user && (
                        <Link to="/login" className="px-3 py-2 bg-white rounded-lg border text-sm">Login</Link>
                    )}

                    {!admin && user && (
                        <button onClick={() => setUser(null)} className="px-3 py-2 bg-white rounded-lg border text-sm">Logout</button>
                    )}
                </div>
            </div>
        </header>
    );
}