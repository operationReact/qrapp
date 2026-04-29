import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMyOrders } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import { Cabinet } from "@boxicons/react";
import OrderCard from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/button";

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      // if (!user?.token) {
      //   navigate("/login", { state: { from: "/orders" } });
      //   return;
      // }

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {orders.map((order) => {
                return <OrderCard key={order.id} order={order} />;
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
