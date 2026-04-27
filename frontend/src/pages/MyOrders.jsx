import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMyOrders } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import {
  Archive,
  ArrowUpRightStroke,
  Cabinet,
  FoodMenu,
  Rupee,
} from "@boxicons/react";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const STATUS_STYLES = {
  PLACED: "bg-yellow-50 text-yellow-800",
  PREPARING: "bg-blue-50 text-blue-800",
  READY: "bg-green-50 text-green-800",
  COMPLETED: "bg-gray-50 text-gray-700",
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      if (!user?.token) {
        navigate("/login", { state: { from: "/orders" } });
        return;
      }

      try {
        const response = await getMyOrders();
        if (!mounted) return;
        setOrders(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!mounted) return;
        const message =
          err?.response?.data || "Unable to load your orders right now.";
        setError(
          typeof message === "string"
            ? message
            : "Unable to load your orders right now.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, [navigate, user?.token]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !["COMPLETED"].includes(order.status)),
    [orders],
  );

  return (
    <div className="page-shell">
      <Navbar />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">My Orders</h1>
              <p className="mt-1 text-md text-muted-foreground">
                Review live order status, see what you ordered, and revisit
                recent purchases.
              </p>
            </div>
            {/* <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Active orders</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900">{activeOrders.length}</div>
                        </div>*/}
          </div>

          {loading && (
            <div className="rounded-3xl bg-white px-6 py-16 text-center text-gray-500 shadow-sm border border-gray-100">
              Loading your order history...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm border">
              <Cabinet pack="filled" className="size-12 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">No orders yet!</h2>
              <p className="mt-2 max-w-sm mx-auto text-muted-foreground">
                Start with your favourite dishes and they'll show up here
                automatically.
              </p>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="font-medium! mt-8 min-w-60 w-1/2 h-12"
              >
                <Link to="/">Browse Menu</Link>
              </Button>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {orders.map((order) => {
                const createdAt = order.createdAt
                  ? new Date(order.createdAt)
                  : null;
                const statusClass =
                  STATUS_STYLES[order.status] || "bg-gray-50 text-gray-700";
                return (
                  <article
                    key={order.id}
                    className="border p-4 bg-white md:hover:shadow-sm hover:bg-white/80 rounded-2xl"
                  >
                    <div className="flex gap-4 items-start justify-between">
                      <div>
                        <div>
                          <h2 className="text-lg font-semibold">
                            Order #{order.id}
                          </h2>
                          <Badge className={statusClass}>
                            <Archive pack="filled" /> {order.status}
                          </Badge>
                          <Badge variant="outline" className="ml-1">
                            <Rupee pack="filled" />{" "}
                            {order.paymentStatus || "Pending"}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {createdAt
                            ? createdAt.toLocaleString()
                            : "Timestamp unavailable"}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="space-x-1 order-2 sm:order-1">
                          {/* <Button
                            variant="link"
                            className="border-primary"
                            size="icon-lg"
                          >
                            <ArrowUpRightStroke className="size-5" />{" "}
                            <span className="sr-only">View Order Details</span>
                          </Button>*/}
                          <Drawer>
                            <DrawerTrigger asChild>
                              <Button variant="outline" size="icon-lg">
                                <FoodMenu pack="filled" className="size-5" />{" "}
                                <span className="sr-only">Order Items</span>
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-w-md mx-auto">
                              <DrawerHeader>
                                <DrawerTitle className="text-xl font-semibold">
                                  Order#{order.id} Items
                                </DrawerTitle>
                              </DrawerHeader>
                              <div className="pb-4 px-4">
                                <ul className="pl-4 marker:text-muted-foreground/50 list-disc">
                                  {(order.items || []).map((item, index) => (
                                    <li
                                      key={`${index}-${order.id}-${item.name}`}
                                      className="py-1 border-b last:border-b-0"
                                    >
                                      <div className="flex gap-3 items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm">
                                            <span>{item.quantity}x</span>{" "}
                                            {item.name || "Menu Item"}
                                          </div>
                                          <Badge variant="green-outline">
                                            {item.isVeg === true
                                              ? "• Veg"
                                              : item.isVeg === false
                                                ? "• Non-veg"
                                                : "All"}
                                          </Badge>
                                        </div>
                                        <div className="text-sm font-semibold">
                                          ₹
                                          {(
                                            (item.price || 0) *
                                            (item.quantity || 0)
                                          ).toFixed(2)}
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full h-12 font-medium!"
                                  >
                                    Close
                                  </Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </div>
                        <div className="text-xl font-semibold text-right sm:text-left">
                          ₹{Number(order.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
