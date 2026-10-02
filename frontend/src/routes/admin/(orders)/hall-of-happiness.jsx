import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfettiIcon, PlusIcon } from "@phosphor-icons/react";
import { adminHallOfHappinessOptions } from "@/query/options/admin-hall-of-happiness";
import { adminLocationsOptions } from "@/query/options/management";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { canSelectAllLocations } from "@/lib/roles";
import {
  createCuratedHallPhoto,
  runHallPhotoAction,
  updateAdminHallPhoto,
} from "@/services/hall-of-happiness-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KPIStrip } from "@/components/admin/hall-of-happiness/KPIStrip";
import { SearchToolbar } from "@/components/admin/hall-of-happiness/SearchToolbar";
import { MemoryGrid } from "@/components/admin/hall-of-happiness/MemoryGrid";
import { FilterSheet } from "@/components/admin/hall-of-happiness/FilterSheet";
import { MemoryDetailView } from "@/components/admin/hall-of-happiness/MemoryDetailView";
import { AddMemoryFlow } from "@/components/admin/hall-of-happiness/AddMemoryFlow";
import { QuickFilterPills } from "@/components/admin/hall-of-happiness/QuickFilterPills";
import { HeroMoment } from "@/components/admin/hall-of-happiness/HeroMoment";

export const Route = createFileRoute("/admin/(orders)/hall-of-happiness")({
  component: HallOfHappinessAdminPage,
});

function HallOfHappinessAdminPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const canGlobal = canSelectAllLocations(user);
  const { data: locations = [] } = useQuery(adminLocationsOptions());

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [consent, setConsent] = useState("");
  const [orderId, setOrderId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(0);

  // UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Build query params
  const params = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(consent ? { consent } : {}),
    ...(orderId ? { orderId } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(locationFilter ? { locationId: locationFilter } : {}),
    page,
    size: 30,
  };

  // Fetch hall of happiness data
  const query = useQuery(adminHallOfHappinessOptions(params));
  const photos = query.data?.content || [];
  const submissions = groupBySubmission(photos);

  // Calculate stats
  const stats = {
    pending: photos.filter((p) => ["PENDING_REVIEW", "PENDING"].includes(p.status)).length,
    approved: photos.filter((p) => p.status === "APPROVED").length,
    published: photos.filter((p) => p.status === "PUBLISHED").length,
    rejected: photos.filter((p) => p.status === "REJECTED").length,
  };

  // Count active filters
  const activeFilterCount = [status, consent, locationFilter, fromDate, toDate, orderId].filter(
    Boolean
  ).length;

  // Refresh after mutations
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "hall-of-happiness"] });

  // Photo actions (approve, reject, publish, unpublish, remove)
  const action = useMutation({
    mutationFn: ({ id, name }) => runHallPhotoAction(id, name),
    onSuccess: refresh,
    onError: (error, { name }) => {
      if (error.response?.data?.message === "photo_removed") {
        toast.warning("This photo has been removed. Refreshing...");
        setTimeout(() => {
          refresh();
          setSelectedSubmission(null);
        }, 500);
      } else {
        toast.error(`Failed to ${name} photo. Please try again.`);
      }
    },
  });

  // Edit photo metadata
  const edit = useMutation({
    mutationFn: ({ id, payload }) => updateAdminHallPhoto(id, payload),
    onSuccess: refresh,
    onError: (error) => {
      // Check if photo was removed
      if (error.response?.data?.message === "photo_removed") {
        toast.warning("This photo has been removed. Refreshing...");
        setTimeout(() => {
          refresh();
          setSelectedSubmission(null);
        }, 500);
      } else {
        toast.error("Failed to save changes. Please try again.");
      }
    },
  });

  // Create curated photo
  const create = useMutation({
    mutationFn: ({ file, caption, eventLabel, description, locationId, global }) =>
      createCuratedHallPhoto({ file, caption, eventLabel, description, locationId, global }),
    onSuccess: () => {
      toast.success("Memory added. Approve and publish it to show it on Home.");
      refresh();
      setAddMemoryOpen(false);
    },
    onError: () => toast.error("Could not add this memory. Please try again."),
  });

  // Handle filter apply
  const handleApplyFilters = (newFilters) => {
    setStatus(newFilters.status);
    setConsent(newFilters.consent);
    setLocationFilter(newFilters.locationId);
    setFromDate(newFilters.fromDate);
    setToDate(newFilters.toDate);
    setOrderId(newFilters.orderId);
    setPage(0);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (page + 1 < (query.data?.totalPages || 1)) {
      setPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="admin-control-center min-h-screen bg-[var(--cc-page)] pb-10 text-[var(--cc-text)]">
      {/* Header */}
      <div className="mx-auto max-w-[1400px] px-4 pt-6 pb-4 md:px-6 border-b border-[var(--cc-border)]">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
            <ConfettiIcon size={25} weight="duotone" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">❤️ Hall of Happiness</h1>
            <p className="mt-1 text-sm text-[var(--cc-secondary-text)]">
              Real moments from Bro & Bro
            </p>
          </div>
          <Button
            onClick={() => setAddMemoryOpen(true)}
            className="bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)]"
            size="sm"
          >
            <PlusIcon size={16} />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 md:px-6">
        {/* KPI Strip */}
        {!query.isLoading && (
          <KPIStrip stats={stats} />
        )}

        {/* Hero Moment (Featured Published Memory) */}
        {!query.isLoading && submissions.length > 0 && (
          <HeroMoment
            submission={submissions.find(
              (s) => s.photos.some((p) => p.status === "PUBLISHED")
            )}
          />
        )}

        {/* Search & Filter Toolbar */}
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onFilterClick={() => setFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* Quick Filter Pills - Only show if no active filters except status */}
        {activeFilterCount === 0 || (activeFilterCount === 1 && status) ? (
          <QuickFilterPills activeStatus={status} onStatusChange={setStatus} />
        ) : null}

        {/* Memory Grid */}
        {query.isError ? (
          <div className="rounded-[16px] border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-5 text-sm text-[var(--cc-error)]">
            Unable to load Hall of Happiness photos. Please try again.
          </div>
        ) : (
          <MemoryGrid
            submissions={submissions}
            isLoading={query.isLoading}
            onSelectSubmission={setSelectedSubmission}
          />
        )}

        {/* Pagination */}
        {!query.isLoading && submissions.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--cc-border)] pt-4">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {query.data?.totalPages || 1} • Showing {photos.length} of {query.data?.totalElements || 0}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || query.isLoading}
                onClick={handlePrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= (query.data?.totalPages || 1) || query.isLoading}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        onApply={handleApplyFilters}
        filters={{ status, consent, locationId: locationFilter, fromDate, toDate, orderId }}
        locations={locations}
        canGlobal={canGlobal}
      />

      {/* Memory Detail View */}
      {selectedSubmission && (
        <MemoryDetailView
          open={!!selectedSubmission}
          onOpenChange={(isOpen) => !isOpen && setSelectedSubmission(null)}
          submission={selectedSubmission}
          onAction={action.mutate}
          onEdit={edit.mutate}
          actionPending={action.isPending || edit.isPending}
        />
      )}

      {/* Add Memory Flow */}
      <AddMemoryFlow
        open={addMemoryOpen}
        onOpenChange={setAddMemoryOpen}
        onCreated={({ file, caption, eventLabel, description, locationId, global }) =>
          create.mutate({ file, caption, eventLabel, description, locationId, global })
        }
        locations={locations}
        activeLocationId={activeLocationId}
        canGlobal={canGlobal}
      />
    </div>
  );
}

// Helper: Group photos by submission
function groupBySubmission(photos) {
  const groups = new Map();
  photos.forEach((photo) => {
    const key = photo.submissionId ? `submission-${photo.submissionId}` : `photo-${photo.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        submissionId: photo.submissionId,
        sourceType: photo.sourceType,
        photos: [],
        customerName: photo.customerName,
        orderId: photo.orderId,
        eventType: photo.eventType,
        eventLabel: photo.eventLabel,
        eventDateTime: photo.eventDateTime,
        createdAt: photo.createdAt,
        consentStatus: photo.consentStatus,
      });
    }
    groups.get(key).photos.push(photo);
  });
  return Array.from(groups.values());
}
