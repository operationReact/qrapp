import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Filter, Search } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import OrderItem from "@/components/admin/OrderItem";

import { useAdminDashboard } from "@/context/AdminDashboardContext";
import AdminHeader from "@/components/admin/AdminHeader";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";

export default function OperationalQueue() {
  const {
    ordersPage,
    page,
    setPage,
    size,
    setSize,
    filters,
    setFilters,
    loadData,
  } = useAdminDashboard();

  const params = useParams();
  const selectedOrderId = params?.orderId ? Number(params.orderId) : undefined;

  const { admin } = useAdminAuth();

  useEffect(() => {
    loadData({ quiet: true });
  }, []);

  if (!admin?.username || !admin?.password) {
    return (
      <Navigate to={"/login"} replace state={{ from: location.pathname }} />
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-[450px_1fr] flex-1">
        <div className="flex flex-col border-r h-full">
          <AdminHeader
            title="Operational Queue"
            description="Search any order, filter by workflow state, and open the full detail panel."
          />

          <div className="flex gap-2 mt-2 border-b pl-4 pr-5 pb-2 justify-between items-center">
            <ButtonGroup>
              <InputGroup className="rounded-md max-w-[300px]">
                <InputGroupInput
                  value={filters.query}
                  onChange={(e) => {
                    setPage(0);
                    setFilters((prev) => ({ ...prev, query: e.target.value }));
                  }}
                  placeholder="Search by order id or Phone..."
                  className="text-sm!"
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="text-sm! font-medium!">
                    <Filter />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="leading-none font-medium">Filters</h4>
                      <p className="text-sm text-muted-foreground">
                        Filter by order status, payment status and priority.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="order-status">Order Status</Label>
                        <Select
                          defaultValue="ALL"
                          name="order-status"
                          value={filters.status || "ALL"}
                          onValueChange={(value) => {
                            setPage(0);
                            setFilters((prev) => ({
                              ...prev,
                              status: value.replace("ALL", ""),
                            }));
                          }}
                        >
                          <SelectTrigger className="text-sm! w-full">
                            <SelectValue placeholder="Order status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel className="text-primary">
                                Order Status
                              </SelectLabel>
                              <SelectItem value="ALL">All Statuses</SelectItem>
                              <SelectItem value="PLACED">Placed</SelectItem>
                              <SelectItem value="PREPARING">
                                Preparing
                              </SelectItem>
                              <SelectItem value="READY">Ready</SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="payment-status">Payment Status</Label>
                        <Select
                          value={filters.paymentStatus || "ALL"}
                          onValueChange={(value) => {
                            setPage(0);
                            setFilters((prev) => ({
                              ...prev,
                              paymentStatus: value.replace("ALL", ""),
                            }));
                          }}
                        >
                          <SelectTrigger className="text-sm! w-full">
                            <SelectValue placeholder="All Payments" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel className="text-primary">
                                Payment Status
                              </SelectLabel>
                              <SelectItem value="ALL">All Payments</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={filters.priority || "ALL"}
                          onValueChange={(value) => {
                            setPage(0);
                            setFilters((prev) => ({
                              ...prev,
                              priority: value.replace("ALL", ""),
                            }));
                          }}
                        >
                          <SelectTrigger className="text-sm! w-full">
                            <SelectValue placeholder="All Priorities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel className="text-primary">
                                Priority
                              </SelectLabel>
                              <SelectItem value="ALL">
                                All Priorities
                              </SelectItem>
                              <SelectItem value="NORMAL">Normal</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </ButtonGroup>

            <div className="flex items-center space-x-1">
              <Switch
                id="live-only"
                checked={filters.liveOnly}
                onCheckedChange={(checked) => {
                  setPage(0);
                  setFilters((prev) => ({
                    ...prev,
                    liveOnly: checked,
                  }));
                }}
              />
              <Label htmlFor="live-only">Live only</Label>
            </div>
          </div>

          <ScrollArea className="pl-2 pr-3 max-h-[calc(100vh_-_45.2px_-_80px_-_40.8px_-_8px_-_49.6px)] py-2 flex-1">
            {(ordersPage.content || []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No orders found for the selected filters.
              </div>
            )}
            {(ordersPage.content || []).map((order) => {
              return (
                <Link
                  key={order.id}
                  to={`/admin/operational-queue/${order.id}`}
                  className={cn(
                    "block rounded-lg transition-colors my-1 first:mt-0 p-3 border border-transparent",
                    order.id === selectedOrderId
                      ? "bg-zinc-100 border-zinc-200"
                      : "",
                  )}
                >
                  <OrderItem key={order.id} order={order} />
                </Link>
              );
            })}
          </ScrollArea>

          <div className="flex border-b lg:border-b-none gap-3 px-2 border-t py-2 text-sm items-center justify-between">
            <div className="text-muted-foreground">
              {ordersPage.totalElements || 0} orders
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={size}
                onValueChange={(size) => {
                  setPage(0);
                  setSize(Number(size));
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <SelectTrigger>
                  <SelectValue placeholder="items/page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Items Per Page</SelectLabel>
                    <SelectItem value={1}>1 / page</SelectItem>
                    <SelectItem value={10}>10 / page</SelectItem>
                    <SelectItem value={20}>20 / page</SelectItem>
                    <SelectItem value={30}>30 / page</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <ButtonGroup>
                <Button
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  variant="outline"
                >
                  Prev
                </Button>
                <InputGroup className="min-w-21 flex items-center justify-center">
                  <span>
                    Page {page + 1} of {ordersPage.totalPages || 1}
                  </span>
                </InputGroup>
                <Button
                  onClick={() =>
                    setPage((prev) =>
                      Math.min((ordersPage.totalPages || 1) - 1, prev + 1),
                    )
                  }
                  disabled={page >= (ordersPage.totalPages || 1) - 1}
                  variant="outline"
                >
                  Next
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </div>
        <div className="flex flex-col h-full">
          <ScrollArea className="py-2 pr-3 lg:max-h-[calc(100vh_-_45.2px)] flex-1">
            <Outlet />
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
