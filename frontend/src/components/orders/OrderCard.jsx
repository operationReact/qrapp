import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { Archive, FoodMenu, Rupee } from "@boxicons/react";

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
      className="border p-4 bg-white md:hover:shadow-sm hover:bg-white/80 rounded-2xl"
    >
      <div className="flex gap-4 items-start justify-between">
        <div>
          <div>
            <Badge className={cn("capitalize", statusClass)}>
              <Archive pack="filled" data-icon="inline-start" />
              {order.status.includes("ORDER_PLACED")
                ? "Placed"
                : order.status.toLowerCase()}
            </Badge>
            <Badge variant="outline" className="ml-1 capitalize">
              <Rupee pack="filled" data-icon="inline-start" />{" "}
              {order.paymentStatus.toLowerCase() || "Pending"}
            </Badge>
            <h2 className="text-sm font-medium mt-2">{order.orderNumber}</h2>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {createdAt ? createdAt.toLocaleString() : "Timestamp unavailable"}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-right order-2 sm:order-1">
            {/* <Button variant="link" className="border-primary" size="icon-lg"> */}
            {/*   <ArrowUpRightStroke className="size-5" />{" "} */}
            {/*   <span className="sr-only">View Order Details</span> */}
            {/* </Button> */}
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
                  <DrawerDescription className="sr-only">
                    List of your order items
                  </DrawerDescription>
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
          <div className="text-xl font-semibold text-right">
            ₹{Number(order.total || 0).toFixed(2)}
          </div>
        </div>
      </div>
    </article>
  );
}
