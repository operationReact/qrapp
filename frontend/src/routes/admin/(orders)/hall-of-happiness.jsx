import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircleIcon,
  ConfettiIcon,
  EyeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  TrashIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { adminHallOfHappinessOptions } from "@/query/options/admin-hall-of-happiness";
import {
  runHallPhotoAction,
  updateAdminHallPhoto,
  uploadAdminHallPhoto,
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
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploadOrderId, setUploadOrderId] = useState("");
  const params = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(consent ? { consent } : {}),
    ...(orderId ? { orderId } : {}),
    page: 0,
    size: 50,
  };
  const query = useQuery(adminHallOfHappinessOptions(params));
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "hall-of-happiness"] });
  const upload = useMutation({
    mutationFn: () => uploadAdminHallPhoto({ orderId: uploadOrderId, file, caption }),
    onSuccess: () => {
      setFile(null);
      setCaption("");
      setUploadOrderId("");
      refresh();
    },
  });
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
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Hall of Happiness</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Review consent, moderate, and publish Party/Event memories.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 pb-8">
        <form
          className="rounded-2xl border bg-card p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (uploadOrderId && file) upload.mutate();
          }}
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UploadSimpleIcon size={19} /> Add photo to a completed Party Order
          </div>
          <div className="grid gap-3 md:grid-cols-[150px_1fr_1fr_auto]">
            <input
              value={uploadOrderId}
              onChange={(event) => setUploadOrderId(event.target.value)}
              placeholder="Order ID"
              type="number"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              required
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Caption (optional)"
              maxLength={240}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            />
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="h-10 rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
            <Button type="submit" disabled={upload.isPending || !file}>
              {upload.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Photos start pending and cannot be published until the customer grants consent.
          </p>
        </form>

        <div className="flex flex-wrap gap-2">
          <InputGroup className="w-full max-w-sm">
            <InputGroupAddon><MagnifyingGlassIcon weight="bold" /></InputGroupAddon>
            <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, customer, caption…" />
          </InputGroup>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            {["CUSTOMER_UPLOAD", "PENDING_REVIEW", "PENDING", "APPROVED", "PUBLISHED", "REJECTED", "UNPUBLISHED", "WITHDRAWN", "REMOVED"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <select value={consent} onChange={(event) => setConsent(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="">All consent</option>
            {["PENDING", "GRANTED", "REVOKED"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" type="number" className="h-10 w-28 rounded-lg border bg-background px-3 text-sm" />
        </div>

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
          </div>
        ) : query.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Unable to load Hall of Happiness photos.</div>
        ) : query.data?.content?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.content.map((photo) => (
              <PhotoReviewCard key={photo.id} photo={photo} action={action} edit={edit} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <ImageIcon size={32} className="mx-auto mb-2" /> No photos match these filters.
          </div>
        )}
      </div>
    </>
  );
}

function PhotoReviewCard({ photo, action, edit }) {
  const [caption, setCaption] = useState(photo.caption || "");
  const [order, setOrder] = useState(photo.displayOrder ?? 0);
  const can = (name) => !action.isPending && action.mutate({ id: photo.id, name });

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
        <img src={photo.thumbnailUrl || photo.imageUrl} alt={photo.caption || photo.eventType || "Event memory"} className="h-full w-full object-cover" />
        <a href={photo.imageUrl} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white" aria-label="Preview original">
          <EyeIcon size={18} />
        </a>
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
