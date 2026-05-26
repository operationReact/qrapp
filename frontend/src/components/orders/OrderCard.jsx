import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn, formatDate } from "@/lib/utils";
import { Archive, FoodMenu, Rupee } from "@boxicons/react";
import { CalendarIcon, CookingPotIcon, OvenIcon } from "@phosphor-icons/react";

const STATUS_STYLES = {
  ORDER_PLACED: "bg-yellow-50 text-yellow-800",
  PLACED: "bg-yellow-50 text-yellow-800",
  PREPARING: "bg-blue-50 text-blue-800",
  READY: "bg-green-50 text-green-800",
  COMPLETED: "bg-gray-50 text-gray-700",
};

export default function OrderCard({ order }) {
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const statusClass = STATUS_STYLES[order.status] || "bg-gray-50 text-gray-700";

  return (
    <article
      key={order.id}
      className={cn(
        "border overflow-clip md:hover:shadow rounded-md",
        statusClass,
      )}
    >
      <div className={cn("py-1 pt-2 text-xs font-medium")}>
        <Badge className={cn("capitalize", statusClass)}>
          <Archive pack="filled" data-icon="inline-start" />
          Order{" "}
          {order.status.includes("ORDER_PLACED")
            ? "Placed"
            : order.status.toLowerCase()}
        </Badge>
      </div>

      <div className="bg-background m-1.5 shadow-xs text-foreground mt-1 rounded-md">
        <div className="grid grid-cols-[1fr_auto] p-3 gap-4">
          <div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                ORDER ID
              </span>
              <h2 className="text-base font-semibold">{order.orderNumber}</h2>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="capitalize">
                <Rupee pack="filled" data-icon="inline-start" />
                {order.paymentStatus.toLowerCase() || "Pending"}
              </Badge>
            </div>
          </div>

          <div className="flex text-right items-end justify-between flex-col gap-2">
            <div className="text-xl font-semibold text-right">
              ₹{Number(order.total || 0).toFixed(2)}
            </div>
            <Drawer>
              <DrawerTrigger
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className:
                    "text-secondary-foreground mt-auto border-border! rounded-sm",
                })}
                title="View ordered items"
              >
                <CookingPotIcon weight="duotone" />{" "}
                <span className="sr-only">View items</span>
              </DrawerTrigger>
              <DrawerContent className="max-w-md mx-auto">
                <DrawerHeader>
                  <DrawerTitle className="text-lg font-semibold">
                    Your Order
                  </DrawerTitle>
                  <DrawerDescription>#{order.orderNumber}</DrawerDescription>
                </DrawerHeader>
                <div className="pb-4 px-4">
                  <ul className="pl-4 marker:text-muted-foreground/50 list-disc">
                    {(order.items || []).map((item, index) => (
                      <li
                        key={`${index}-${order.id}-${item.name}`}
                        className="py-1.5"
                      >
                        <div className="flex gap-3 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                ` bg-transparent border-2 rounded font-medium p-1`,
                                item.isVeg
                                  ? "text-accent-400 border-accent-400"
                                  : "text-red-500 border-red-500",
                              )}
                            >
                              <span>{item.isVeg ? "VEG" : "NONVEG/NA"}</span>
                            </Badge>
                            <div className="text-sm">
                              <span className="font-medium group-hover/order-item:text-primary transition duration-100">
                                {item.quantity}x •{" "}
                              </span>
                              {item.isVeg ? "Veg " : "Non Veg "}
                              {item.name || "Menu Item"}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            ₹
                            {((item.price || 0) * (item.quantity || 0)).toFixed(
                              2,
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <DrawerFooter>
                  <DrawerClose
                    className={buttonVariants({
                      variant: "outline",
                      className: "border-border!",
                    })}
                  >
                    Close
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        <div className="grid px-2 text-xs text-secondary-foreground bg-zinc-100 py-2 rounded-sm rounded-t-none border-t mt-2 grid-cols-[auto_1fr] gap-4 font-medium">
          <div className="flex items-center gap-1">
            <CookingPotIcon weight="duotone" className="size-4" />{" "}
            {order.items.length} Items
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon weight="duotone" className="size-4" />{" "}
            {createdAt ? (
              <time>{formatDate(createdAt)}</time>
            ) : (
              "Timestamp unavailable"
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
