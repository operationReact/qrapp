import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useUserAuth } from "../context/UserAuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  walletGetBalance,
  getCachedWalletBalance,
  clearWalletCache,
} from "../services/api";
import { Cart, User } from "@boxicons/react";

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
  const shouldOpenCartDrawer = location.pathname !== "/cart";

  const userName = useMemo(
    () => user?.info?.name?.trim() || user?.info?.phone || "Account",
    [user],
  );
  const userSecondary = useMemo(() => user?.info?.phone || "Signed in", [user]);
  const initials = useMemo(() => {
    const source = (user?.info?.name || user?.info?.phone || "A").trim();
    return source.slice(0, 1).toUpperCase();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function fetchBalance(forceRefresh = false) {
      if (!user || !user.token) {
        setWalletBalance(null);
        return;
      }
      setLoadingBalance(true);
      try {
        if (forceRefresh) clearWalletCache();
        const cached = !forceRefresh ? getCachedWalletBalance() : null;
        if (cached) {
          if (!mounted) return;
          setWalletBalance(cached.balance ?? 0);
        } else {
          const resp = await walletGetBalance();
          if (!mounted) return;
          setWalletBalance(resp?.data?.balance ?? 0);
        }
      } catch (e) {
        console.error("Failed to load wallet balance", e);
        if (mounted) setWalletBalance(null);
      } finally {
        if (mounted) setLoadingBalance(false);
      }
    }
    fetchBalance();

    const handleWalletUpdate = () => fetchBalance(true);
    window.addEventListener("wallet:updated", handleWalletUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("wallet:updated", handleWalletUpdate);
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
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const logout = () => {
    setMenuOpen(false);
    setUser(null);
    navigate("/login");
  };

  const menuItems = [
    {
      to: "/orders",
      label: "My orders",
      description: "Track active and past orders",
      icon: ClipboardDocumentListIcon,
    },
    {
      to: "/profile",
      label: "Edit profile",
      description: "Update your name, phone, and password",
      icon: PencilSquareIcon,
    },
    {
      to: "/wallet",
      label: "Wallet",
      description: "Check balance and transactions",
      icon: WalletIcon,
    },
    {
      to: "/",
      label: "Browse menu",
      description: "Go back to the food menu",
      icon: Squares2X2Icon,
    },
  ];

  return (
    <header className="pt-4 pb-2">
      <div className="container-premium flex min-h-[72px] items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src="/brand/main.svg" alt="Bro & Bro Logo" className="w-14" />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {!admin && user && (
            <Link
              to="/wallet"
              className="flex items-center gap-1 h-11 rounded-full border-2 border-amber-200 bg-linear-to-b from-[#FFEFBD] to-[#FEEE70] p-2 text-black"
            >
              <img src="/coin.png" alt="Coin" className="size-6" />
              <span className="max-w-[5.5rem] truncate text-sm font-semibold sm:max-w-none">
                {loadingBalance
                  ? "..."
                  : walletBalance == null
                    ? "Wallet"
                    : `₹ ${(walletBalance / 100).toFixed(2)}`}
              </span>
            </Link>
          )}

          <button
            size="icon-lg"
            variant="ghost"
            onClick={() => {
              if (shouldOpenCartDrawer) {
                openDrawer();
              } else {
                closeDrawer();
                navigate("/cart");
              }
            }}
            aria-label="Open cart"
            className="relative rounded-2xl"
          >
            <Cart pack="filled" className="size-7" />
            <span className="absolute -left-1 -bottom-1 align-middle size-5 rounded-full aspect-square grid place-items-center text-center text-[13px] font-semibold bg-red-500 text-secondary">
              {cart.length}
            </span>
          </button>

          {!admin && !user && (
            <Link
              to="/login"
              className="rounded-full aspect-square grid place-items-center bg-red-50 border border-red-100 size-11 text-sm font-medium"
            >
              <User pack="filled" className="size-6 fill-red-500" />
            </Link>
          )}

          {!admin && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                className="flex items-center justify-center gap-2 rounded-full border border-red-100 sm:border-none bg-white size-11 sm:size-fit sm:px-2 sm:py-1.5 text-sm font-medium text-gray-700"
              >
                <span className="hidden md:inline text-sm">Account</span>
                <span className="flex items-center size-full sm:size-7 justify-center rounded-full bg-red-200 sm:bg-red-100 text-xs font-bold text-red-700">
                  {menuOpen ? <XMarkIcon className="h-5 w-5" /> : "A"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute z-41 right-0 mt-3 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl">
                  <div className="border-b border-red-50 bg-red-50 px-4 py-4">
                    <div className="text-base font-semibold">
                      {userName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      @{userSecondary}
                    </div>
                  </div>

                  <div className="p-2">
                    {menuItems.map(({ to, label, description, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-red-50"
                      >
                        <Icon className="mt-0.5 h-5 w-5 flex-none text-red-600" />
                        <span>
                          <span className="block font-semibold capitalize">
                            {label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {description}
                          </span>
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
                        <span className="block font-semibold">
                          Logout
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Sign out of your account safely
                        </span>
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
