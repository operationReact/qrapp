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
          <svg
            width="56"
            height="56"
            aria-label="Bro & Bro"
            viewBox="0 0 952 952"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path="url(#clip0_58_48)">
              <path
                d="M387.633 419.98C376.313 367.171 443.544 307.281 518.366 337.831C577.287 361.888 594.531 444.876 506.342 488.932C498.899 492.65 504.947 495.385 513.378 503.674C538.058 527.936 552.887 546.776 554.56 546.676C563.444 546.142 579.151 498.751 595.033 494.953C601.471 493.411 615.545 493.147 626.448 497.04C639.653 501.752 638.044 509.809 638.398 513.292C628.326 556.733 591.484 577.197 599.266 585.276C634.974 622.357 664.411 640.474 634.728 654.605C582.183 679.62 565.157 616.675 552.849 626.203C543.665 633.317 485.383 678.449 408.718 643.953C372.567 627.687 313.78 545.638 415.345 482.574C430.936 472.893 398.335 469.893 387.633 419.98ZM504.485 565.584C456.971 517.067 455.918 516.758 452.927 517.805C438.432 522.878 424.79 542.337 422.93 544.993C409.199 564.583 423.102 587.985 434.263 595.282C453.673 607.974 475.213 604.728 478.281 604.639C491.855 602.987 502.823 599.182 517.103 588.388C524.402 582.872 519.083 580.489 504.485 565.584ZM510.527 392.262C501.873 375.532 475.16 376.7 471.832 376.846C440.377 383.032 427.405 412.679 454.712 443.606C465.091 455.361 466.115 461.888 479.811 453.105C505.611 436.564 524.972 420.192 510.527 392.262Z"
                fill="#383838"
              />
              <path
                className="fill-primary transition"
                d="M188.283 738.876C213.671 725.883 216.211 723.076 220.792 730.191C259.162 789.774 303.072 783.682 298.19 799.567C282.532 850.511 205.507 874.639 217.207 862.974C234.321 845.91 238.105 828.215 236.602 828.209C227.287 828.176 234.95 850.919 156.239 876.492C141.047 881.427 66.1571 897.763 89.6924 881.351C166.541 827.758 170.949 801.195 208.007 762.67C208.715 762.078 208.335 761.941 209.021 761.368C210.84 759.856 208.805 759.908 208.738 759.467C207.861 758.776 208.509 757.742 206.868 757.991C151.757 766.378 134.228 834.428 125.739 825.517C124.66 824.385 124.59 771.47 188.283 738.876ZM90.248 820.187C115.757 823.38 84.793 851.346 64.3613 864.453C39.4165 880.456 27.7188 890.782 20.5176 886.191C7.81088 878.084 24.0304 870.332 51.5107 849.487C71.8871 834.028 79.1016 824.251 90.248 820.187ZM539.345 658.858C558.068 649.045 553.985 668.395 543.068 677.742C511.364 704.877 453.628 729.703 448.962 736.186C444.4 742.522 438.812 759.189 400.976 802.87C393.223 811.821 349.591 853.139 325.473 862.236C312.031 862.621 312.731 854.92 313.43 841.974C313.939 832.591 327.856 775.137 325.246 772.364C324.653 771.744 277.181 767.106 249.765 735.558C241.001 725.474 240.187 721.749 247.723 717.851C293.683 694.076 296.276 684.969 310.901 695.522C395.002 756.217 425.183 718.684 539.345 658.858ZM112.352 730.617C136.322 711.47 147.827 726.375 138.476 735.348C132.719 740.871 112.587 756.397 110.289 758.169C79.2032 782.141 77.4904 784.295 62.4434 792.283C50.2561 794.352 44.5342 785.904 57.8047 775.292C85.4355 753.194 84.753 752.664 112.352 730.617ZM6.29297 242.742C9.51735 238.861 11.9616 235.922 69.1416 237.36C91.1463 237.913 86.8307 249.961 86.5381 347.998C86.377 402.213 85.215 408.195 90.0293 404.695C117.841 384.471 125.491 380.67 158.132 374.626C171.886 373.25 171.797 373.238 172.986 373.14C221.468 369.144 283.758 399.374 313.261 451.677C395.971 598.302 240.357 763.713 88.499 680.286C-14.5351 623.682 0.781147 505.296 0.832031 479.428C1.26237 253.687 -1.52075 252.144 6.29297 242.742ZM644.098 283.224C644.27 283.148 701.724 275.113 713.029 289.071C725.276 304.19 714.108 400.368 719.949 402.728C723.451 404.139 730.793 386.528 779.198 375.133C848.706 358.769 964.937 417.841 950.824 553.606C937.197 684.712 782.236 740.693 684.152 674.066C667.029 662.434 688.178 655.958 681.034 636.597C671.634 611.115 634.239 586.781 641.205 572.565C642.207 570.521 642.439 570.749 654.087 547.204C681.862 492.381 654.73 480.31 649.665 478.059C632.401 470.379 635.074 466.52 635.099 447.632C635.316 293.197 631.854 288.566 644.098 283.224ZM204.986 449.186C185.129 442.245 165.678 444.554 164.485 444.575C76.261 451.494 33.7181 575.622 121.478 628.878C224.273 691.261 340.754 545.681 232.922 463.823C230.912 462.298 221.026 454.793 204.986 449.186ZM848.808 463.095C822.947 442.593 786.866 446.093 781.335 446.629C655.692 470.442 688.034 651.913 804.694 638.031C881.228 628.924 927.549 525.511 848.808 463.095ZM488.978 178.528C606.59 76.6048 757.549 53.6227 796.427 67.8088C821.437 76.9372 797.054 199.269 778.802 250.274C770.133 274.497 709.135 247.764 694.783 239.393C624.945 198.647 610.19 149.665 607.422 146.742C602.478 141.525 524.508 186.997 480.008 228.857C345.663 355.24 348.487 397.375 321.308 399.781C285.059 389.588 324.649 357.697 334.519 331.145C336.039 327.058 332.454 326.494 317.176 324.565C309.548 323.602 309.769 323.589 302.33 322.5C276.658 318.737 231.494 316.426 227.487 305.876C225.846 301.555 225.363 299.562 264.761 261.714C304.618 223.428 387.579 235.622 427.225 226.5C433.32 225.096 435.933 224.496 488.978 178.528ZM718.166 106.913C729.344 100.719 762.707 88.6716 747.491 89.4749C747.416 89.4792 701.126 103.858 678.068 113.744C643.861 128.407 646.882 133.758 646.655 144.419C650.011 164.111 665.425 136.141 718.166 106.913Z"
              />
            </g>
            <defs>
              <clipPath id="clip0_58_48">
                <rect width="952" height="952" fill="white" />
              </clipPath>
            </defs>
          </svg>
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
            <span className="absolute -left-1 -bottom-1 align-middle size-5 rounded-full aspect-square grid place-items-center text-center text-[13px] font-semibold bg-primary text-secondary">
              {cart.length}
            </span>
          </button>

          {!admin && !user && (
            <Link
              to="/login"
              className="rounded-full transition-colors aspect-square grid place-items-center bg-white border border-primary/5 size-11 text-sm font-medium"
            >
              <User pack="filled" className="size-6 fill-primary" />
            </Link>
          )}

          {!admin && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                className="flex items-center justify-center gap-2 rounded-full border border-primary/5 sm:border-none bg-white size-11 sm:size-fit sm:px-2 sm:py-1.5 text-sm font-medium text-gray-700"
              >
                <span className="hidden md:inline text-sm">Account</span>
                <span className="flex items-center size-full sm:size-7 justify-center rounded-full bg-white sm:bg-primary/5 text-xs font-bold text-primary">
                  {menuOpen ? <XMarkIcon className="h-5 w-5" /> : "A"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute z-41 right-0 mt-3 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-primary-foreground bg-white shadow-xl shadow-zinc-900/10">
                  <div className="border-b border-primary/10 bg-linear-to-bl from-primary/10 to-white px-4 py-4">
                    <div className="text-base font-semibold">{userName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      @{userSecondary}
                    </div>
                  </div>

                  <div className="p-2">
                    {menuItems.map(({ to, label, description, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-start gap-3 rounded-xl px-3 py-3 text-sm hover:bg-primary-foreground/40"
                      >
                        <Icon className="mt-0.5 h-5 w-5 flex-none text-primary" />
                        <span>
                          <span className="block font-medium capitalize">
                            {label}
                          </span>
                          <span className="block text-xs font-medium text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </Link>
                    ))}

                    <button
                      type="button"
                      onClick={logout}
                      className="mt-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-primary-foreground/40"
                    >
                      <ArrowRightOnRectangleIcon className="mt-0.5 h-5 w-5 flex-none text-primary" />
                      <span>
                        <span className="block font-medium! text-sm">
                          Logout
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
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
