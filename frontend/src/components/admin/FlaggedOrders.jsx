import { AlertCircle } from "@boxicons/react";
import { ArrowUpRight } from "lucide-react";
import OrderItem from "./OrderItem";
import { Link } from "react-router-dom";

export default function FlaggedOrders({flaggedOrders = []}) {
  return (
    <section id="flagged-orders" className="bg-amber-50/80 border border-amber-200 rounded-lg">
      <div className="px-4 py-3 border-b border-b-amber-200">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="size-5 animate-alarm" />
            <h2 className="font-medium">
              {flaggedOrders.length} orders need your attention
            </h2>
          </div>
          <p className="text-sm text-amber-800 ml-7">
            These orders are either delayed, urgent, or waiting to be handed
            over.
          </p>
        </div>
      </div>
      <div className="grid p-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {flaggedOrders.map((order) => (
          <Link
            to={`/admin/operational-queue/${order.id}`}
            key={order.id}
            className="bg-white lg:pb-9 pb-4 isolate z-10 relative group no-underline! block hover:border-amber-200 transition-all rounded-xl p-3 border-2 border-amber-100"
          >
            <OrderItem key={order.id} order={order} />

            <div
              aria-hidden
              className="hidden lg:flex font-medium bottom-0 inset-x-0 h-7 absolute duration-300 transition-all ease-out overflow-hidden bg-white mt-2 gap-2 items-center text-zinc-600 border-t border-t-zinc-100 rounded-full text-sm"
            >
              <span className="size-6 bg-zinc-100 ml-0.5 rounded-full grid place-items-center text-zinc-600">
                <ArrowUpRight className="size-4 rotate-45 group-hover:rotate-0 transition-transform duration-100 ease-out" />
              </span>
              <span className="opacity-25 w-0 overflow-hidden group-hover:w-80 inline-block group-hover:opacity-100 transition-all duration-200 text-nowrap">
                operational queue
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
