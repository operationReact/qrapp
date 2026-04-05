import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    ClipboardDocumentListIcon,
    PencilSquareIcon,
    ShoppingCartIcon,
    Squares2X2Icon,
    WalletIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useUserAuth } from "../context/UserAuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useEffect, useMemo, useRef, useState } from 'react';
import { walletGetBalance, getCachedWalletBalance, clearWalletCache } from '../services/api';

export default function Navbar() {
    const { cart, openDrawer, closeDrawer } = useCart();
    const { user, setUser } = useUserAuth();
    const { admin } = useAdminAuth();
    const [walletBalance, setWalletBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const userName = useMemo(() => user?.info?.name?.trim() || user?.info?.phone || 'Account', [user]);
    const userSecondary = useMemo(() => user?.info?.phone || 'Signed in', [user]);
    const initials = useMemo(() => {
        const source = (user?.info?.name || user?.info?.phone || 'A').trim();
        return source.slice(0, 1).toUpperCase();
    }, [user]);

    useEffect(() => {
        let mounted = true;
        async function fetchBalance(forceRefresh = false) {
            if (!user || !user.token) { setWalletBalance(null); return; }
            setLoadingBalance(true);
            try {
                if (forceRefresh) clearWalletCache();
                const cached = !forceRefresh ? getCachedWalletBalance() : null;
                if (cached) { if (!mounted) return; setWalletBalance(cached.balance ?? 0); }
                else { const resp = await walletGetBalance(); if (!mounted) return; setWalletBalance(resp?.data?.balance ?? 0); }
            } catch (e) { console.error('Failed to load wallet balance', e); if (mounted) setWalletBalance(null); }
            finally { if (mounted) setLoadingBalance(false); }
        }
        fetchBalance();

        const handleWalletUpdate = () => fetchBalance(true);
        window.addEventListener('wallet:updated', handleWalletUpdate);
        return () => {
            mounted = false;
            window.removeEventListener('wallet:updated', handleWalletUpdate);
        };
    }, [user]);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen]);

    const logout = () => {
        setMenuOpen(false);
        setUser(null);
        navigate('/login');
    };

    const menuItems = [
        {
            to: '/orders',
            label: 'My orders',
            description: 'Track active and past orders',
            icon: ClipboardDocumentListIcon,
        },
        {
            to: '/profile',
            label: 'Edit profile',
            description: 'Update your name, phone, and password',
            icon: PencilSquareIcon,
        },
        {
            to: '/wallet',
            label: 'Wallet',
            description: 'Check balance and transactions',
            icon: WalletIcon,
        },
        {
            to: '/',
            label: 'Browse menu',
            description: 'Go back to the food menu',
            icon: Squares2X2Icon,
        },
    ];

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
                            <span className="text-xs sm:text-sm">{loadingBalance ? '...' : walletBalance == null ? 'Wallet' : `₹ ${(walletBalance / 100).toFixed(2)}`}</span>
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
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                aria-label="Open account menu"
                                aria-expanded={menuOpen}
                                className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
                            >
                                {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                                <span className="hidden sm:inline">Account</span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                    {initials}
                                </span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
                                    <div className="border-b border-amber-50 bg-amber-50/70 px-4 py-4">
                                        <div className="text-sm font-semibold text-gray-900">{userName}</div>
                                        <div className="mt-1 text-xs text-gray-500">{userSecondary}</div>
                                    </div>

                                    <div className="p-2">
                                        {menuItems.map(({ to, label, description, icon: Icon }) => (
                                            <Link
                                                key={to}
                                                to={to}
                                                onClick={() => setMenuOpen(false)}
                                                className="flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-amber-50"
                                            >
                                                <Icon className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                                                <span>
                                                    <span className="block font-semibold text-gray-900">{label}</span>
                                                    <span className="block text-xs text-gray-500">{description}</span>
                                                </span>
                                            </Link>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={logout}
                                            className="mt-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-red-50"
                                        >
                                            <ArrowRightOnRectangleIcon className="mt-0.5 h-5 w-5 flex-none text-red-500" />
                                            <span>
                                                <span className="block font-semibold text-gray-900">Logout</span>
                                                <span className="block text-xs text-gray-500">Sign out of your account safely</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}