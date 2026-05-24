import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponAnalytics,
  toggleCouponStatus,
} from "../../services/api";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrashIcon,
  PencilSimpleIcon,
  ChartLineIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import CouponForm from "@/components/admin/CouponForm";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminCouponsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: admin, setUser: setAdmin } = useAuth();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function loadCoupons() {
    setLoading(true);
    try {
      const response = await fetchCoupons();
      setCoupons(response.data || []);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await createCoupon(data);
      setCreateDialogOpen(false);
      loadCoupons();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try {
      await updateCoupon(selectedCoupon.id, data);
      setEditDialogOpen(false);
      setSelectedCoupon(null);
      loadCoupons();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      await toggleCouponStatus(coupon.id);
      loadCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCoupon(selectedCoupon.id);
      setDeleteDialogOpen(false);
      setSelectedCoupon(null);
      loadCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalytics = async (coupon) => {
    setSelectedCoupon(coupon);
    setAnalyticsData(null);
    setAnalyticsLoading(true);
    setAnalyticsDialogOpen(true);
    try {
      const response = await getCouponAnalytics(coupon.id);
      setAnalyticsData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const openEditDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setDeleteDialogOpen(true);
  };

  const formatDiscount = (coupon) => {
    if (coupon.discountType === "PERCENTAGE") {
      return `${coupon.discountValue}%`;
    }
    return `$${coupon.discountValue}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getExpiryStatus = (coupon) => {
    if (coupon.isExpired) return { label: "Expired", variant: "destructive" };
    if (coupon.isNotStarted) return { label: "Upcoming", variant: "secondary" };
    if (coupon.isLimitReached)
      return { label: "Limit Reached", variant: "outline" };
    return { label: "Active", variant: "default" };
  };

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Coupons"
          description="Manage coupons and discounts."
          className="px-0 pt-0"
        />

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="sm:w-auto"
          size="lg"
        >
          <PlusIcon className="size-5" />
          New Coupon
        </Button>
      </div>

      <div className="space-y-6">
        <div className="px-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => {
                    const expiryStatus = getExpiryStatus(coupon);
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-medium">
                              {coupon.code}
                            </span>
                            {coupon.title && (
                              <Badge
                                variant="outline"
                                className="w-fit text-xs"
                              >
                                {coupon.title}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDiscount(coupon)}</TableCell>
                        <TableCell>{formatDate(coupon.expiresAt)}</TableCell>
                        <TableCell>
                          <Badge variant={expiryStatus.variant}>
                            {expiryStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {coupon.totalRedemptions || 0} /{" "}
                              {coupon.totalUsageLimit || "∞"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={coupon.isActive}
                              onCheckedChange={() => handleToggle(coupon)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAnalytics(coupon)}
                            >
                              <ChartLineIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(coupon)}
                            >
                              <PencilSimpleIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(coupon)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-medium">Create Coupon</DialogTitle>
                <DialogDescription>
                  Create a new coupon code for your customers.
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
                <CouponForm
                  id="create-coupon-form"
                  onSubmit={handleCreate}
                  isLoading={submitting}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="create-coupon-form"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Create Coupon"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-medium">Edit Coupon</DialogTitle>
                <DialogDescription>
                  Update the coupon details.
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
                <CouponForm
                  id="edit-coupon-form"
                  initialData={selectedCoupon}
                  onSubmit={handleUpdate}
                  isLoading={submitting}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-coupon-form"
                  disabled={submitting}
                >
                  {submitting ? "Updating..." : "Update Coupon"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={analyticsDialogOpen}
            onOpenChange={setAnalyticsDialogOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Coupon Analytics</DialogTitle>
                <DialogDescription>
                  {selectedCoupon?.code} - {selectedCoupon?.title}
                </DialogDescription>
              </DialogHeader>
              {analyticsLoading ? (
                <div className="py-8 text-center">Loading analytics...</div>
              ) : analyticsData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Total Redemptions
                      </div>
                      <div className="text-2xl font-semibold">
                        {analyticsData.totalRedemptions || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Remaining
                      </div>
                      <div className="text-2xl font-semibold">
                        {analyticsData.remainingUsageLimit || 0}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Total Discount Given
                      </div>
                      <div className="text-2xl font-semibold">
                        $
                        {analyticsData.totalDiscountGiven?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Avg Discount
                      </div>
                      <div className="text-2xl font-semibold">
                        $
                        {analyticsData.averageDiscountPerOrder?.toFixed(2) ||
                          "0.00"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Total Revenue
                      </div>
                      <div className="text-2xl font-semibold">
                        $
                        {analyticsData.totalRevenueGenerated?.toFixed(2) ||
                          "0.00"}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Avg Order Value
                      </div>
                      <div className="text-2xl font-semibold">
                        ${analyticsData.averageOrderValue?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Unique Users
                      </div>
                      <div className="text-2xl font-semibold">
                        {analyticsData.uniqueUsers || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Conversion
                      </div>
                      <div className="text-2xl font-semibold">
                        {analyticsData.conversionPercentage?.toFixed(1) || "0"}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No analytics data available
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Coupon</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this coupon? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
