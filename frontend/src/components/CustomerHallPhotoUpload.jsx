import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  HeartIcon,
  ImageIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { myHallOrderPhotosOptions } from "@/query/options/my-hall-order-photos";
import { uploadHallPhotosForOrder } from "@/services/hall-of-happiness-service";
import { toast } from "sonner";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const STATUS_LABELS = {
  CUSTOMER_UPLOAD: "Pending",
  PENDING_REVIEW: "Pending",
  PENDING: "Pending",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  UNPUBLISHED: "Approved",
  REMOVED: "Removed",
};

function statusIcon(status) {
  if (status === "PUBLISHED") return <CheckCircleIcon className="text-emerald-600" />;
  if (status === "REJECTED" || status === "REMOVED") return <XCircleIcon className="text-red-500" />;
  if (status === "APPROVED" || status === "UNPUBLISHED") return <CheckCircleIcon className="text-blue-600" />;
  return <ClockIcon className="text-amber-600" />;
}

export default function CustomerHallPhotoUpload({ order }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const photosQuery = useQuery(myHallOrderPhotosOptions(order.id, order.status === "COMPLETED"));
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  const upload = useMutation({
    mutationFn: () => uploadHallPhotosForOrder({
      orderId: order.id,
      files,
      caption,
      consent,
      onUploadProgress: (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hall-of-happiness"] });
      setFiles([]);
      setCaption("");
      setConsent(false);
      setProgress(0);
      setOpen(false);
      toast.success("Photos submitted for Hall of Happiness review.");
    },
    onError: (error) => {
      setProgress(0);
      toast.error(error?.response?.data?.message || "Unable to submit photos.");
    },
  });

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length + files.length > MAX_FILES) {
      toast.error(`You can submit up to ${MAX_FILES} photos at a time.`);
      return;
    }
    const invalid = selected.find((file) =>
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > MAX_FILE_BYTES,
    );
    if (invalid) {
      toast.error("Use JPEG or PNG photos up to 5 MB each.");
      return;
    }
    setFiles((current) => [...current, ...selected]);
    event.target.value = "";
  };

  if (order.status !== "COMPLETED") return null;

  return (
    <div className="col-span-2 w-full rounded-lg border border-rose-200 bg-rose-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HeartIcon size={20} weight="duotone" className="text-rose-500" />
          <div>
            <p className="text-sm font-semibold">Hall of Happiness</p>
            <p className="text-xs text-muted-foreground">Share memories from this event.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <CloudArrowUpIcon /> Upload Event Photos
        </Button>
      </div>

      {photosQuery.data?.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-rose-200 pt-3">
          <p className="text-xs font-semibold text-secondary-foreground">Your submitted photos</p>
          {photosQuery.data.map((photo) => (
            <div key={photo.id} className="flex items-center gap-2 rounded-lg bg-white/70 p-2 text-xs">
              <img src={photo.thumbnailUrl} alt="" className="h-9 w-12 rounded object-cover" />
              {statusIcon(photo.status)}
              <span className="font-medium">{STATUS_LABELS[photo.status] || photo.status}</span>
              {photo.caption && <span className="truncate text-muted-foreground">· {photo.caption}</span>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Event Photos</DialogTitle>
            <DialogDescription>
              Select up to {MAX_FILES} photos from this completed event. Every photo is reviewed before publication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/40 p-4 text-center">
              <ImageIcon size={28} className="mb-1 text-rose-500" />
              <span className="text-sm font-medium">Choose photos</span>
              <span className="text-xs text-muted-foreground">JPEG or PNG · 5 MB each</span>
              <Input type="file" accept="image/jpeg,image/png" multiple onChange={chooseFiles} className="sr-only" />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map(({ file, url }, index) => (
                  <div key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={url} alt={file.name} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white" aria-label={`Remove ${file.name}`}>
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={240} placeholder="Caption (optional)" />
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
              <span>I agree that Bro &amp; Bro may showcase these photos in the Hall of Happiness.</span>
            </label>
            {upload.isPending && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                <span>Uploading{progress ? ` ${progress}%` : "…"} </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={upload.isPending}>Cancel</Button>
            <Button onClick={() => upload.mutate()} disabled={!files.length || !consent || upload.isPending}>
              {upload.isPending ? "Submitting…" : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
