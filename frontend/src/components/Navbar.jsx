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
    const shouldOpenCartDrawer = location.pathname !== '/cart';

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
        <header className="sticky top-0 z-50 bg-white/95 shadow-header backdrop-blur-sm">
            <div className="container-premium flex min-h-[72px] items-center justify-between gap-3 py-3">
                <Link to="/" className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">🍽</div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-amber-700 sm:text-base">Bro & Bro</div>
                        <div className="text-[11px] text-gray-500 sm:hidden">Order faster on mobile</div>
                    </div>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    {!admin && user && (
                        <Link to="/wallet" className="flex items-center gap-2 rounded-full bg-amber-500 px-3 py-2 text-white shadow-md">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="#fff2cc" stroke="#f59e0b" strokeWidth="1"/></svg>
                            <span className="max-w-[5.5rem] truncate text-xs font-semibold sm:max-w-none sm:text-sm">{loadingBalance ? '...' : walletBalance == null ? 'Wallet' : `₹ ${(walletBalance / 100).toFixed(2)}`}</span>
                        </Link>
                    )}

                    <button onClick={() => {
                        if (shouldOpenCartDrawer) {
                            openDrawer();
                        } else {
                            closeDrawer();
                            navigate('/cart');
                        }
                    }} aria-label="Open cart" className="relative rounded-2xl bg-red-500 p-2.5 text-white shadow-md">
                        <ShoppingCartIcon className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-white px-1.5 text-center text-[11px] font-semibold text-red-500">{cart.length}</span>
                    </button>

                    {!admin && !user && (
                        <Link to="/login" className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">Login</Link>
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
                                <span className="hidden md:inline">Account</span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                    {initials}
                                </span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-3 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-2xl">
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