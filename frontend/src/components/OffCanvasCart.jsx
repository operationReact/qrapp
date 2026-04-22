import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import CartItem from "./CartItem";
import { Receipt } from "@boxicons/react";

export default function OffCanvasCart() {
  const {
    drawerOpen,
    closeDrawer,
    cart,
    getTotal,
    addItem,
    decreaseItem,
    removeItem,
  } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  // Admins should not be able to place orders - hide cart UI
  if (admin) return null;

  // If we're on the dedicated /cart route (or subpaths like /cart/...), don't show the off-canvas drawer
  if (location && location.pathname && location.pathname.startsWith("/cart"))
    return null;

  console.log(cart);

  return (
    <div
      className={`fixed inset-0 z-60 ${drawerOpen ? "" : "hidden"}`}
      aria-hidden={!drawerOpen}
    >
      <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />

      <aside
        className={`pointer-events-auto fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-[1.75rem] bg-white p-4 shadow-xl transition-transform duration-300 ease-out md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-96 md:rounded-l-[1.75rem] md:rounded-tr-none md:p-5 ${drawerOpen ? "translate-y-0" : "translate-y-full md:translate-y-0 md:translate-x-full"} sheet-safe-bottom`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Your Cart</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Review items before checkout
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={closeDrawer}
            className="text-sm font-medium transition-transform duration-150 active:scale-95"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div
          className="overflow-y-auto pr-1"
          style={{ maxHeight: "calc(85vh - 11rem)" }}
        >
          {cart.length === 0 && (
            <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Cart is empty
            </p>
          )}

          {cart.map((item) => (
            <CartItem
              item={item}
              key={item.id}
              addItem={addItem}
              decreaseItem={decreaseItem}
              removeItem={removeItem}
            />
          ))}
        </div>

        <div className="mt-6 py-2 border-t">
          <div className="flex items-center justify-between rounded-xl py-2">
            <div className="text-muted-foreground flex gap-2 items-center font-medium">
              <Receipt pack="filled" /> Total
            </div>
            <div className="font-bold text-lg">₹{getTotal()}</div>
          </div>

          <Button
            size="lg"
            onClick={() => {
              closeDrawer();
              navigate("/cart");
            }}
            className="w-full h-12 font-medium!"
          >
            Checkout
          </Button>
        </div>
      </aside>
    </div>
  );
}
