import { useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Separator } from "../ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import {
  BowlFoodIcon,
  CompassIcon,
  ConfettiIcon,
  CubeIcon,
  LockKeyIcon,
  ShoppingCartSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
  UserGearIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const items = [
  {
    key: "home",
    label: "Home",
    icon: ({ className }) => (
      <picture className={`${className} overflow-hidden`}>
        <img
          src="/bro-logo.png"
          alt="Bro Logo"
          className="size-full object-contain [body[data-segmented-filter='veg']_&]:hidden animate-in"
        />
        <img
          src="/brand/veg.png"
          alt="Bro Logo Veg"
          className="size-full object-contain [body:where([data-segmented-filter='all'],[data-segmented-filter='nonveg'])_&]:hidden animate-in"
        />
      </picture>
    ),
    path: "/",
  },
  {
    key: "search",
    label: "Explore",
    icon: CompassIcon,
    path: "/search",
  },
  {
    key: "cart",
    label: "Cart",
    icon: ShoppingCartSimpleIcon,
    path: "/cart",
  },
  {
    key: "account",
    label: "Account",
    icon: UserCircleIcon,
    path: "/profile",
  },
];


function UserAccountDrawerContent() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const initials = useMemo(() => {
    const source = (user?.info?.name || user?.info?.phone || "A").trim();
    return source.slice(0, 1).toUpperCase();
  }, [user]);

  const menuItems = [
    { to: "/profile", label: "Profile", icon: UserGearIcon },
    { to: "/orders", label: "Orders", icon: CubeIcon },
    { to: "/party-orders", label: "Party Orders", icon: ConfettiIcon },
  ];

  return (
    <div className="flex flex-col gap-0 px-4 pb-4">
      <div className="flex shadow-sm items-center mb-2 gap-3 p-3 rounded-xl border mb-1">
        <Avatar className="size-10">
          <AvatarFallback className="text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.info?.name || "User"}
          </p>
          <Button
            variant="link"
            size="xs"
            className="gap-1 shrink-0 justify-start px-0 h-auto"
            onClick={() => navigate({ to: "/profile" })}
          >
            <LockKeyIcon weight="fill" />
            Change Password
          </Button>
        </div>
      </div>

      {menuItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={buttonVariants({
            variant: "ghost",
            className: "justify-start gap-3 h-11",
          })}
        >
          <Icon weight="duotone" className="size-5 text-primary shrink-0" />
          <span>{label}</span>
        </Link>
      ))}

      <Separator className="my-2" />

      <Button
        variant="destructive"
        size="lg"
        className="justify-start gap-3"
        onClick={() => {
          setUser(null);
          navigate({ to: "/login" });
        }}
      >
        <SignOutIcon weight="fill" className="size-5" />
        Log out
      </Button>
    </div>
  );
}

function UserUnauthorizedDrawerContent() {
  return (
    <>
      <div className="p-4 grid grid-cols-2 gap-2">
        <Link
          className={buttonVariants({
            size: "lg",
          })}
          to="/login"
        >
          Login
        </Link>

        <Link
          className={buttonVariants({ variant: "secondary", size: "lg" })}
          to="/register"
        >
          Create Account
        </Link>
      </div>

      <DrawerFooter>
        <DrawerClose
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            class: "border-border!",
          })}
        >
          Close
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

export default function MobileMenu() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { cart, openDrawer, closeDrawer } = useCart();
  const visible = useScrollVisibility();

  const shouldOpenCartDrawer = location.pathname !== "/cart";

  if (!isMobile) return null;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 mx-auto flex min-h-[60px] w-full max-w-md isolate items-end justify-between border-x border-t border-border bg-card px-2 pb-[calc(0.3rem+var(--app-safe-bottom))] pt-1 shadow-[0_8px_28px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-out will-change-transform md:min-h-0 md:py-3",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      {items.slice(0, -2).map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.key}
            to={item.path}
            className={cn(
              `touch-manipulation grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              isActive && "after:scale-y-100",
            )}
            aria-label={item.label}
          >
            <item.icon
              weight={isActive ? "fill" : undefined}
              className={`size-[18px] mb-0.5 transition-all md:size-6 ${isActive ? "text-primary scale-105 md:scale-110" : "text-zinc-400"}`}
            />
            <span
              className={`h-full overflow-y-clip text-[10px] font-medium ${isActive ? "text-primary" : "text-zinc-400"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={() => {
          if (shouldOpenCartDrawer) {
            openDrawer();
          } else {
            closeDrawer();
          }
        }}
        className={cn(
          `touch-manipulation grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
          location.pathname === "/cart" && "after:scale-y-100",
        )}
        aria-label={"Cart"}
      >
        <span className="relative">
          <ShoppingCartSimpleIcon
            weight={location.pathname === "/cart" ? "fill" : undefined}
            className={`size-[18px] mb-0.5 transition-all md:size-6 ${location.pathname === "/cart" ? "text-primary scale-105 md:scale-110" : "text-zinc-400"}`}
          />
          {cart.length > 0 && (
            <span className="absolute will-change-transform origin-center -right-1 -top-1 align-middle h-4 min-w-[1rem] animate-in-scaled rounded-full grid place-items-center text-center text-[11px] font-semibold bg-primary text-secondary">
              {cart.length}
            </span>
          )}
        </span>
        <span
          className={`h-full overflow-y-clip text-[10px] font-medium ${location.pathname === "/cart" ? "text-primary" : "text-zinc-400"}`}
        >
          Cart
        </span>
      </button>

      <Drawer>
        <DrawerTrigger asChild>
          <button
            className={cn(
              `touch-manipulation grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              location.pathname === "/profile" && "after:scale-y-100",
            )}
            aria-label="Account"
            tabIndex={0}
          >
            <UserCircleIcon
              weight="fill"
              className={`size-[18px] mb-0.5 transition-all md:size-6 ${location.pathname === "/profile" ? "text-primary scale-105 md:scale-110" : "text-zinc-400"}`}
            />
            <span
              className={`text-[10px] font-medium ${location.pathname === "/profile" ? "text-primary" : "text-zinc-400"}`}
            >
              Account
            </span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold">Account</DrawerTitle>
            {user ? (
              <DrawerDescription className="text-balance mx-auto">
                Manage your account
              </DrawerDescription>
            ) : (
              <DrawerDescription className="text-balance mx-auto">
                Login to access your order history and wallet
              </DrawerDescription>
            )}
          </DrawerHeader>
          {user ? (
            <UserAccountDrawerContent />
          ) : (
            <UserUnauthorizedDrawerContent />
          )}
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
