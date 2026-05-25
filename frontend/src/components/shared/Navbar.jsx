import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { walletBalanceOptions } from "@/query/options/wallet";
import { useIsMobile } from "@/hooks/use-mobile";
import ModeSwitcher from "@/components/ModeSwitcher";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BowlFoodIcon,
  CubeIcon,
  ShoppingCartSimpleIcon,
  SignOutIcon,
  UserGearIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { cart, openDrawer, closeDrawer } = useCart();
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldOpenCartDrawer = location.pathname !== "/cart";

  const initials = useMemo(() => {
    const source = (user?.info?.name || user?.info?.phone || "A").trim();
    return source.slice(0, 1).toUpperCase();
  }, [user]);

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: walletData, isLoading: loadingBalance } = useQuery({
    ...walletBalanceOptions,
    enabled: !!user?.token,
  });

  useEffect(() => {
    const handleWalletUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
    };
    window.addEventListener("wallet:updated", handleWalletUpdate);
    return () => {
      window.removeEventListener("wallet:updated", handleWalletUpdate);
    };
  }, [queryClient]);

  const walletBalance = walletData?.balance ?? null;

  const logout = () => {
    setUser(null);
    navigate({ to: "/login" });
  };

  const menuItems = [
    {
      to: "/profile",
      label: "Profile",
      icon: UserGearIcon,
    },
    {
      to: "/orders",
      label: "Orders",
      icon: CubeIcon,
    },

    {
      to: "/wallet",
      label: "Wallet",
      icon: WalletIcon,
    },
    {
      to: "/",
      label: "Menu",
      icon: BowlFoodIcon,
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
            <g clipPath="url(#clip0_58_48)">
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

        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 justify-end">
          {!isAdmin && user && (
            <Link
              to="/wallet"
              className="flex items-center gap-1 h-10 rounded-full border-2 border-amber-200 bg-linear-to-b from-[#FFEFBD] to-[#FEEE70] p-2 text-black"
            >
              <img src="/coin.png" alt="Coin" className="size-6" />
              <span className="max-w-[5.5rem] truncate text-sm font-semibold sm:max-w-none">
                {loadingBalance
                  ? "..."
                  : walletBalance == null
                    ? "Wallet"
                    : `₹${walletBalance.toFixed(0)}`}
              </span>
            </Link>
          )}

          {!isMobile && (
            <button
              onClick={() => {
                if (shouldOpenCartDrawer) {
                  openDrawer();
                } else {
                  closeDrawer();
                  navigate({ to: "/cart" });
                }
              }}
              aria-label="Open cart"
              className="relative rounded-2xl"
            >
              <ShoppingCartSimpleIcon weight="fill" className="size-6" />
              {cart.length > 0 && (
                <span className="absolute will-change-transform origin-center -right-1 -top-1 align-middle h-4 min-w-[1rem] px-px animate-in-scaled rounded-full grid place-items-center text-center text-[12px] font-semibold bg-primary text-secondary">
                  {cart.length}
                </span>
              )}
            </button>
          )}

          {!isMobile && !isAdmin && !user && (
            <Link
              to="/login"
              className={buttonVariants({
                size: "lg",
                className: "w-full max-w-20",
              })}
            >
              Login
            </Link>
          )}

          {/* className="size-11 flex items-center aspect-square aria-expanded:ring aria-expanded:ring-primary/40 transition-colors justify-center rounded-full bg-white text-sm font-medium! text-primary"*/}
          {!isMobile && !isAdmin && user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open account menu"
                render={
                  <button className="rounded-full will-change-transform aria-expanded:scale-95 aria-expanded:ring aria-expanded:ring-primary transition-all">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                }
              ></DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-50 rounded-lg shadow"
                align="end"
              >
                {menuItems.map(({ to, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={to}
                    render={
                      <Link key={to} to={to}>
                        <Icon weight="fill" className="size-5" />
                        <span className="text-sm font-medium text-foreground">
                          {label}
                        </span>
                      </Link>
                    }
                  ></DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="hover:bg-red-100 border border-red-100 focus:bg-red-100! font-medium! focus:text-red-500"
                >
                  <SignOutIcon className="size-5 text-red-500 fill-red-500" />{" "}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Separator
            orientation="vertical"
            className="h-7 bg-primary/10 my-auto hidden md:block"
          />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  );
}
