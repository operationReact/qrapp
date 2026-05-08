import { useNavigate, useLocation, Link } from "react-router-dom";
import { BoxAlt, CartAlt2, Compass, User } from "@boxicons/react";
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
    icon: Compass,
    path: "/search",
  },
  {
    key: "cart",
    label: "Cart",
    icon: CartAlt2,
    path: "/cart",
  },
  {
    key: "account",
    label: "Account",
    icon: User,
    path: "/profile",
  },
];

function UserAccountDrawerContent() {
  return (
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
        <BoxAlt pack="filled" className="size-6 text-primary mb-2" />{" "}
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
        <User pack="filled" className="size-6 text-primary mb-2" />{" "}
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
            "h-fit col-span-2 text-lg gap-4 to-white p-4 items-center justify-start border-amber-200! bg-linear-to-br from-[#FFEFBD] to-[#FEEE70]",
        })}
      >
        <img src="/coin.png" className="size-12 text-primary mb-2" />{" "}
        <div>
          <span
            aria-label="Bro Wallet"
            className="font-semibold! inline-block mb-1 text-md"
          >
            <img src="/bro-wallet.svg" alt="Bro Wallet" />
          </span>
          <span className="block text-xs text-muted-foreground">
            Check balance and transactions
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function MobileMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useUserAuth();

  if (!isMobile) return null;

  return (
    <nav className="fixed border-x left-0 right-0 bottom-0 z-40 w-full max-w-md isolate mx-auto flex justify-between items-end px-2 py-3 bg-white shadow-[0_8px_38px_rgba(0,0,0,0.06)] border-t border-zinc-200/70">
      {items.slice(0, -1).map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={cn(
              `flex flex-col items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              isActive && "after:scale-y-100",
            )}
            aria-label={item.label}
            tabIndex={0}
          >
            <item.icon
              pack={isActive ? "filled" : "outline"}
              className={`w-6 h-6 mb-0.5 transition-all ${isActive ? "text-primary scale-110" : "text-zinc-400 group-hover:text-primary"}`}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-zinc-400 group-hover:text-primary"}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      <Drawer>
        <DrawerTrigger asChild>
          <button
            className={cn(
              `flex flex-col items-center transition-transform flex-1 focus:outline-none after:absolute after:scale-y-0 after:top-0 after:w-12 after:h-0.5 after:rounded-b-xl after:bg-primary`,
              location.pathname === "/account" && "after:scale-y-100",
            )}
            aria-label="Account"
            tabIndex={0}
          >
            <User
              pack="outline"
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
            <div className="p-4 grid grid-cols-2 gap-2">
              <Button asChild size="lg" className="text-sm! font-medium! h-12">
                <Link to="/login">Login</Link>
              </Button>
              <Button
                variant="secondary"
                asChild
                size="lg"
                className="text-sm! font-medium! h-12"
              >
                <Link to="/register">Create Account</Link>
              </Button>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 font-medium!"
              >
                Close{" "}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
