import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircleIcon,
  ConfettiIcon,
  CaretLeftIcon,
  CaretRightIcon,
  EyeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { adminHallOfHappinessOptions } from "@/query/options/admin-hall-of-happiness";
import {
  runHallPhotoAction,
  updateAdminHallPhoto,
} from "@/services/hall-of-happiness-service";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/(orders)/hall-of-happiness")({
  component: HallOfHappinessAdminPage,
});

function HallOfHappinessAdminPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [consent, setConsent] = useState("");
  const [orderId, setOrderId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const params = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(consent ? { consent } : {}),
    ...(orderId ? { orderId } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
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
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600">
            <ConfettiIcon size={25} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">❤️ Hall of Happiness</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Review and publish customer-submitted Party/Event memories.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Pending Review: {photos.filter((photo) => ["CUSTOMER_UPLOAD", "PENDING", "PENDING_REVIEW"].includes(photo.status)).length}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-4 pb-8">
        <StatusSummary photos={photos} activeStatus={status} onSelect={setStatus} />

        <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto_auto] md:items-end">
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

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
          </div>
        ) : query.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Unable to load Hall of Happiness photos.</div>
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
    </>
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
        photos: [],
        customerName: photo.customerName,
        orderId: photo.orderId,
        eventType: photo.eventType,
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
  const statuses = ["PENDING_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "WITHDRAWN"];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {statuses.map((value) => {
        const count = photos.filter((photo) => photo.status === value).length;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(activeStatus === value ? "" : value)}
            className={`rounded-xl border p-3 text-left transition ${activeStatus === value ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}
          >
            <p className="text-xs font-medium text-muted-foreground">{statusLabel(value)}</p>
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
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="font-semibold">
            Submission #{submission.submissionId || "legacy"} · Order #{submission.orderId}
          </p>
          <p className="text-sm text-muted-foreground">
            {submission.customerName || "Customer"} · {submission.eventType || "Party/Event"}
          </p>
          <p className="text-xs text-muted-foreground">
            Event: {formatDate(submission.eventDateTime)} · Submitted: {formatDate(submission.createdAt)}
            {publishedAt ? ` · Published: ${formatDate(publishedAt)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{statusLabel(status)}</span>
          <p className="mt-2 text-xs text-muted-foreground">
          {submission.photos.length} Photo{submission.photos.length === 1 ? "" : "s"} · Consent {consentLabel(submission.consentStatus)}
          </p>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2">
      {submission.photos.slice(0, 3).map((photo) => (
        <img key={photo.id} src={photo.thumbnailUrl || photo.imageUrl} alt="" className="h-14 w-14 rounded-lg border object-cover" />
      ))}
      {submission.photos.length > 3 && <span className="text-xs font-semibold text-muted-foreground">+{submission.photos.length - 3}</span>}
      </div>
      <details>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
        Review Submission
      </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {submission.photos.map((photo) => (
            <PhotoReviewCard key={photo.id} photo={photo} action={action} edit={edit} />
          ))}
        </div>
      </details>
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
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
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
            <p className="font-semibold">{photo.eventType || "Party/Event"} · Order #{photo.orderId}</p>
            {photo.submissionId && <p className="text-xs text-muted-foreground">Submission #{photo.submissionId}</p>}
            <p className="text-xs text-muted-foreground">{photo.customerName || "Customer"} · Consent: {photo.consentStatus}</p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">{photo.status}</span>
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
