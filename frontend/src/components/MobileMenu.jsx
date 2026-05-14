import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button, buttonVariants } from "./ui/button";
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
} from "./ui/drawer";
import { useUserAuth } from "@/context/UserAuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CompassIcon,
  CubeIcon,
  ShoppingCartSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";

const items = [
  {
    key: "home",
    label: "Home",
    icon: ({ className }) => (
      <picture className={className}>
        <img
          src="/bro-logo.png"
          alt="Bro Logo"
          className="[body[data-segmented-filter='veg']_&]:hidden animate-in"
        />
        <img
          src="/brand/veg.png"
          alt="Bro Logo Veg"
          className="[body:where([data-segmented-filter='all'],[data-segmented-filter='nonveg'])_&]:hidden animate-in"
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
  const { setUser } = useUserAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="p-4 grid gap-2 grid-cols-2">
        <Link
          to="/orders"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className:
              "h-fit text-lg bg-linear-to-br from-primary/5 border-primary/10! gap-0! to-white flex-col p-4 items-start justify-center",
          })}
        >
          <CubeIcon weight="fill" className="size-6 text-primary mb-2" />{" "}
          <span className="font-semibold!">Your Orders</span>
          <span className="block text-xs text-muted-foreground">
            Track all orders{" "}
          </span>
        </Link>

        <Link
          to="/profile"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className:
              "h-fit text-lg bg-linear-to-br from-primary/5 border-primary/10! gap-0! to-white flex-col p-4 items-start justify-center",
          })}
        >
          <UserIcon weight="fill" className="size-6 text-primary mb-2" />{" "}
          <span className="font-semibold!">Profile</span>
          <span className="block text-xs text-muted-foreground">
            Update your profile{" "}
          </span>
        </Link>

        <Link
          to="/wallet"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className:
              "h-auto col-span-2 text-lg gap-4 to-white p-4 items-center justify-start border-amber-200! bg-linear-to-br from-[#FFEFBD] to-[#FEEE70]",
          })}
        >
          <img
            src="/coin.png"
            width={48}
            height={48}
            loading="eager"
            className="size-12 text-primary mb-2"
          />{" "}
          <div>
            <span
              aria-label="Bro Wallet"
              className="font-semibold! inline-block mb-1 text-md"
            >
              <img
                height={20}
                src="/bro-wallet.svg"
                alt="Bro Wallet"
                loading="eager"
              />
            </span>
            <span className="block text-xs text-muted-foreground">
              Check balance and transactions
            </span>
          </div>
        </Link>
      </div>

      <DrawerFooter className="grid grid-cols-2">
        <DrawerClose
          render={
            <Button variant="outline" size="lg" className="w-full">
              Close{" "}
            </Button>
          }
        ></DrawerClose>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setUser(null);
            navigate("/login");
          }}
          className="w-full"
        >
          <SignOutIcon /> Log out
        </Button>
      </DrawerFooter>
    </>
  );
}

function UserUnauthorizedDrawerContent() {
  return (
    <>
      <div className="p-4 grid grid-cols-2 gap-2">
        <Button size="lg" render={<Link to="/login">Login</Link>}></Button>
        <Button
          variant="secondary"
          size="lg"
          render={<Link to="/register">Create Account</Link>}
        ></Button>
      </div>

      <DrawerFooter>
        <DrawerClose
          render={
            <Button
              variant="outline"
              size="lg"
              className="w-full"
            >
              Close{" "}
            </Button>
          }
        ></DrawerClose>
      </DrawerFooter>
    </>
  );
}

export default function MobileMenu() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useUserAuth();
  const { cart, openDrawer, closeDrawer } = useCart();

  const shouldOpenCartDrawer = location.pathname !== "/cart";

  if (!isMobile) return null;

  return (
    <nav className="fixed border-x left-0 right-0 bottom-0 z-40 w-full max-w-md isolate mx-auto flex justify-between items-end px-2 py-3 bg-white shadow-[0_8px_38px_rgba(0,0,0,0.06)] border-t border-zinc-200/70">
      {items.slice(0, -2).map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.key}
            to={item.path}
            className={cn(
              `grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              isActive && "after:scale-y-100",
            )}
            aria-label={item.label}
          >
            <item.icon
              weight={isActive ? "fill" : undefined}
              className={`w-6 h-6 mb-0.5 transition-all ${isActive ? "text-primary scale-110" : "text-zinc-400"}`}
            />
            <span
              className={`text-[10px] font-semibold overflow-y-clip h-full ${isActive ? "text-primary" : "text-zinc-400"}`}
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
          `grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
          location.pathname === "/cart" && "after:scale-y-100",
        )}
        aria-label={"Cart"}
      >
        <span className="relative">
          <ShoppingCartSimpleIcon
            weight={location.pathname === "/cart" ? "fill" : undefined}
            className={`w-6 h-6 mb-0.5 transition-all ${location.pathname === "/cart" ? "text-primary scale-110" : "text-zinc-400"}`}
          />
          {cart.length > 0 && (
            <span className="absolute will-change-transform origin-center -right-1 -top-1 align-middle h-4 min-w-[1rem] animate-in-scaled rounded-full grid place-items-center text-center text-[12px] font-semibold bg-primary text-secondary">
              {cart.length}
            </span>
          )}
        </span>
        <span
          className={`text-[10px] font-semibold overflow-y-clip h-full ${location.pathname === "cart" ? "text-primary" : "text-zinc-400"}`}
        >
          Cart
        </span>
      </button>

      <Drawer>
        <DrawerTrigger asChild>
          <button
            className={cn(
              `grid place-items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              location.pathname === "/account" && "after:scale-y-100",
            )}
            aria-label="Account"
            tabIndex={0}
          >
            <UserCircleIcon
              weight="fill"
              className={`w-6 h-6 mb-0.5 text-zinc-400 group-hover:text-primary transition-all`}
            />
            <span
              className={`text-[10px] font-medium text-zinc-400 group-hover:text-primary}`}
            >
              Account
            </span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-semibold">
              Account{" "}
            </DrawerTitle>
            {!user && (
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
