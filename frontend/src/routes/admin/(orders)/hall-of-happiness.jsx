import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  ConfettiIcon,
  CaretLeftIcon,
  CaretRightIcon,
  EyeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
  SparkleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/(orders)/hall-of-happiness")({
  component: HallOfHappinessAdminPage,
});

const SOURCE_LABELS = {
  CUSTOMER: { label: "Customer Memory", icon: CameraIcon },
  ADMIN_CURATED: { label: "Bro & Bro Curated", icon: SparkleIcon },
};

function HallOfHappinessAdminPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const canGlobal = canSelectAllLocations(user);
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [consent, setConsent] = useState("");
  const [orderId, setOrderId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
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
  const query = useQuery(adminHallOfHappinessOptions(params));
  const photos = query.data?.content || [];
  const submissions = groupBySubmission(photos);
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "hall-of-happiness"] });
  const action = useMutation({
    mutationFn: ({ id, name }) => runHallPhotoAction(id, name),
    onSuccess: refresh,
  });
  const edit = useMutation({
    mutationFn: ({ id, payload }) => updateAdminHallPhoto(id, payload),
    onSuccess: refresh,
  });

  return (
    <>
      <div className="admin-control-center min-h-screen bg-[var(--cc-page)] pb-10 text-[var(--cc-text)]">
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-5 md:px-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
            <ConfettiIcon size={25} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">❤️ Hall of Happiness</h1>
            <p className="mt-1.5 text-[13px] text-[var(--cc-secondary-text)]">
              Review customer memories and publish curated Bro &amp; Bro moments.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-[var(--cc-warning-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--cc-warning)]">
              Pending Review: {photos.filter((photo) => ["CUSTOMER_UPLOAD", "PENDING", "PENDING_REVIEW"].includes(photo.status)).length}
            </span>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add Memory
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] space-y-5 px-4 pb-8 md:px-6">
        <StatusSummary photos={photos} activeStatus={status} onSelect={setStatus} />

        <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto_auto_auto] md:items-end">
          <InputGroup className="w-full max-w-sm">
            <InputGroupAddon><MagnifyingGlassIcon weight="bold" /></InputGroupAddon>
            <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, event, description…" />
          </InputGroup>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="Status">
            <option value="">All statuses</option>
            {["PENDING_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "WITHDRAWN", "REMOVED"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
          <select value={consent} onChange={(event) => setConsent(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="Consent">
            <option value="">All consent</option>
            {["PENDING", "GRANTED", "REVOKED"].map((value) => <option key={value} value={value}>{consentLabel(value)}</option>)}
          </select>
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="Location">
            <option value="">{canGlobal ? "All Locations" : "My Locations"}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            From Date
            <input value={fromDate} onChange={(event) => setFromDate(event.target.value)} type="date" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            To Date
            <input value={toDate} onChange={(event) => setToDate(event.target.value)} type="date" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Exact Order ID
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="e.g. 1024" type="number" className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground md:w-28" />
          </label>
        </div>
        </div>

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
          </div>
        ) : query.isError ? (
          <div className="rounded-[16px] border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-5 text-sm text-[var(--cc-error)]">Unable to load Hall of Happiness photos.</div>
        ) : submissions.length ? (
          <div className="space-y-5">
            {submissions.map((submission) => (
              <SubmissionReviewCard key={submission.key} submission={submission} action={action} edit={edit} />
            ))}
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {query.data?.totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                  <CaretLeftIcon /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= (query.data?.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>
                  Next <CaretRightIcon />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <ImageIcon size={32} className="mx-auto mb-2" />
            <p className="font-medium">No Hall of Happiness submissions yet.</p>
            <p className="mt-1">Customer-submitted event photos will appear here for review.</p>
          </div>
        )}
      </div>
      <AddMemoryDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
    </>
  );
}

function AddMemoryDialog({ open, onOpenChange, onCreated }) {
  const { activeLocationId } = useActiveLocation();
  const { user } = useAuth();
  const canGlobal = canSelectAllLocations(user);
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [description, setDescription] = useState("");
  const [global, setGlobal] = useState(false);
  const [locationId, setLocationId] = useState(activeLocationId ? String(activeLocationId) : "");

  const create = useMutation({
    mutationFn: () => createCuratedHallPhoto({ file, caption, eventLabel, description, locationId, global }),
    onSuccess: () => {
      toast.success("Memory added. Approve and publish it to show it on Home.");
      reset();
      onOpenChange(false);
      onCreated();
    },
    onError: () => toast.error("Could not add this memory. Please try again."),
  });

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setEventLabel("");
    setDescription("");
    setGlobal(false);
  };

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
      toast.error("Use a JPEG, PNG, or WEBP photo up to 5 MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const canSubmit = Boolean(file) && (global || locationId);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Curated Memory</DialogTitle>
          <DialogDescription>Directly publish a Bro &amp; Bro curated celebration photo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {preview ? (
            <img src={preview} alt="Preview" className="h-48 w-full rounded-[16px] object-cover" />
          ) : (
            <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed text-sm text-muted-foreground">
              <ImageIcon size={28} />
              Choose a photo
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="sr-only" />
            </label>
          )}
          <Input value={caption} maxLength={240} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (shown on the memory card)" />
          <Input value={eventLabel} maxLength={160} onChange={(e) => setEventLabel(e.target.value)} placeholder="Event / client name (optional)" />
          <Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="flex items-center gap-3">
            <select
              value={locationId}
              disabled={global}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {canGlobal && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} /> Global
              </label>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Adding…" : "Add Memory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

function StatusSummary({ photos, activeStatus, onSelect }) {
  const statuses = ["PENDING_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {statuses.map((value) => {
        const count = photos.filter((photo) => photo.status === value).length;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(activeStatus === value ? "" : value)}
            className={`rounded-[16px] border p-4 text-left transition ${activeStatus === value ? "border-[var(--cc-primary)] ring-2 ring-[var(--cc-primary)]/10" : "border-[var(--cc-border)] bg-white"} ${value === "PENDING_REVIEW" ? "bg-[var(--cc-warning-bg)]" : value === "APPROVED" ? "bg-[var(--cc-success-bg)]" : value === "PUBLISHED" ? "bg-[var(--cc-info-bg)]" : "bg-[var(--cc-error-bg)]"}`}
          >
            <p className="text-xs font-semibold text-[var(--cc-secondary-text)]">{statusLabel(value)}</p>
            <p className="mt-1 text-2xl font-bold">{count}</p>
          </button>
        );
      })}
    </div>
  );
}

function statusLabel(value) {
  return {
    CUSTOMER_UPLOAD: "Customer Upload",
    PENDING: "Pending Review",
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Approved",
    PUBLISHED: "Published",
    REJECTED: "Rejected",
    UNPUBLISHED: "Unpublished",
    WITHDRAWN: "Withdrawn",
    REMOVED: "Removed",
  }[value] || value || "Unknown";
}

function consentLabel(value) {
  return { PENDING: "Pending", GRANTED: "Granted", REVOKED: "Revoked" }[value] || value || "Unknown";
}

function overallStatus(photos) {
  if (photos.some((photo) => photo.status === "PENDING_REVIEW" || photo.status === "PENDING")) return "PENDING_REVIEW";
  if (photos.some((photo) => photo.status === "APPROVED")) return "APPROVED";
  if (photos.some((photo) => photo.status === "PUBLISHED")) return "PUBLISHED";
  if (photos.every((photo) => photo.status === "WITHDRAWN")) return "WITHDRAWN";
  if (photos.some((photo) => photo.status === "REJECTED")) return "REJECTED";
  return photos[0]?.status || "UNKNOWN";
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function SubmissionReviewCard({ submission, action, edit }) {
  const status = overallStatus(submission.photos);
  const publishedAt = submission.photos.find((photo) => photo.publishedAt)?.publishedAt;
  const [open, setOpen] = useState(false);
  const curated = submission.sourceType === "ADMIN_CURATED";
  return (
    <section className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="font-semibold">
            {curated ? (
              <span className="inline-flex items-center gap-1.5"><SparkleIcon size={15} weight="fill" className="text-amber-500" /> Bro &amp; Bro Curated</span>
            ) : (
              <>Submission #{submission.submissionId || "legacy"} · Order #{submission.orderId}</>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {curated ? (submission.eventLabel || "Curated memory") : `${submission.customerName || "Customer"} · ${submission.eventType || "Party/Event"}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {curated ? `Added: ${formatDate(submission.createdAt)}` : `Event: ${formatDate(submission.eventDateTime)} · Submitted: ${formatDate(submission.createdAt)}`}
            {publishedAt ? ` · Published: ${formatDate(publishedAt)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "PENDING_REVIEW" ? "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]" : status === "APPROVED" ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : status === "PUBLISHED" ? "bg-[var(--cc-info-bg)] text-[var(--cc-info)]" : "bg-[var(--cc-error-bg)] text-[var(--cc-error)]"}`}>{statusLabel(status)}</span>
          <p className="mt-2 text-xs text-[var(--cc-secondary-text)]">
          {submission.photos.length} Photo{submission.photos.length === 1 ? "" : "s"} · Consent {consentLabel(submission.consentStatus)}
          </p>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2">
      {submission.photos.slice(0, 3).map((photo) => (
        <img key={photo.id} src={photo.thumbnailUrl || photo.imageUrl} alt="" className="h-20 w-20 rounded-[14px] border border-[var(--cc-border)] object-cover" />
      ))}
      {submission.photos.length > 3 && <span className="text-xs font-semibold text-muted-foreground">+{submission.photos.length - 3}</span>}
      </div>
      <Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)]" onClick={() => setOpen(true)}>
        Review {curated ? "Memory" : "Submission"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100vh-32px)] max-w-4xl overflow-y-auto rounded-[20px] border-[var(--cc-border)] bg-white"><DialogHeader><DialogTitle>Review {curated ? "Memory" : "Submission"}</DialogTitle><DialogDescription>{curated ? (submission.eventLabel || "Curated memory") : `${submission.customerName || "Customer"} · ${submission.eventType || "Party/Event"} · Order #${submission.orderId}`}</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2">
          {submission.photos.map((photo) => (
            <PhotoReviewCard key={photo.id} photo={photo} action={action} edit={edit} />
          ))}
        </div></DialogContent></Dialog>
    </section>
  );
}

function PhotoReviewCard({ photo, action, edit }) {
  const [caption, setCaption] = useState(photo.caption || "");
  const [order, setOrder] = useState(photo.displayOrder ?? 0);
  const [imageFailed, setImageFailed] = useState(false);
  const can = (name) => {
    if (action.isPending) return;
    if (["reject", "remove", "unpublish"].includes(name)
        && !window.confirm(`Confirm ${name} for this photo?`)) return;
    action.mutate({ id: photo.id, name });
  };

  return (
    <article className="overflow-hidden rounded-[16px] border border-[var(--cc-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="relative min-h-[180px] aspect-[4/3] bg-[var(--cc-page)] md:min-h-[240px]">
        {imageFailed ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Image unavailable</div>
        ) : (
          <>
            <img
              src={photo.thumbnailUrl || photo.imageUrl}
              alt={photo.caption || photo.eventType || "Event memory"}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
            <a href={photo.imageUrl} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white" aria-label="Preview original">
              <EyeIcon size={18} />
            </a>
          </>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              {photo.sourceType === "ADMIN_CURATED"
                ? (photo.eventLabel || photo.locationName || "Curated Memory")
                : <>{photo.eventType || "Party/Event"} · Order #{photo.orderId}</>}
            </p>
            {photo.submissionId && <p className="text-xs text-muted-foreground">Submission #{photo.submissionId}</p>}
            <p className="text-xs text-muted-foreground">
              {photo.sourceType === "ADMIN_CURATED"
                ? (photo.global ? "Global" : photo.locationName || "Location")
                : `${photo.customerName || "Customer"} · Consent: ${photo.consentStatus}`}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${photo.status === "PENDING_REVIEW" || photo.status === "PENDING" ? "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]" : photo.status === "APPROVED" ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : photo.status === "PUBLISHED" ? "bg-[var(--cc-info-bg)] text-[var(--cc-info)]" : "bg-[var(--cc-error-bg)] text-[var(--cc-error)]"}`}>{statusLabel(photo.status)}</span>
        </div>
        <div className="flex gap-2">
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs" />
          <input value={order} onChange={(event) => setOrder(event.target.value)} type="number" min="0" title="Display order" className="h-9 w-16 rounded-lg border bg-background px-2 text-xs" />
          <Button size="icon" variant="outline" onClick={() => edit.mutate({ id: photo.id, payload: { caption, displayOrder: Number(order) } })} aria-label="Save metadata">
            <PencilSimpleIcon size={16} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(photo.status === "CUSTOMER_UPLOAD" || photo.status === "PENDING_REVIEW" || photo.status === "PENDING" || photo.status === "UNPUBLISHED") && <Button size="sm" variant="outline" onClick={() => can("approve")}><CheckCircleIcon /> Approve</Button>}
          {(photo.status === "CUSTOMER_UPLOAD" || photo.status === "PENDING_REVIEW" || photo.status === "PENDING" || photo.status === "APPROVED" || photo.status === "UNPUBLISHED") && <Button size="sm" variant="outline" onClick={() => can("reject")}><XCircleIcon /> Reject</Button>}
          {photo.status === "APPROVED" && photo.consentStatus === "GRANTED" && <Button size="sm" onClick={() => can("publish")}><CheckCircleIcon /> Publish</Button>}
          {photo.status === "PUBLISHED" && <Button size="sm" variant="outline" onClick={() => can("unpublish")}><ProhibitIcon /> Unpublish</Button>}
          {photo.status !== "REMOVED" && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => can("remove")} aria-label="Remove photo"><TrashIcon size={17} /></Button>}
        </div>
      </div>
    </article>
  );
}
