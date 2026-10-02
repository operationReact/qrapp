import React, { useState } from "react";
import { ImageIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS = ["upload", "details", "review"];

export function AddMemoryFlow({ open, onOpenChange, onCreated, locations, activeLocationId, canGlobal }) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [description, setDescription] = useState("");
  const [global, setGlobal] = useState(false);
  const [locationId, setLocationId] = useState(activeLocationId ? String(activeLocationId) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      alert("Use a JPEG, PNG, or WEBP photo.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      alert("Photo must be up to 5 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleNext = () => {
    if (step === "upload" && !file) {
      alert("Please select a photo.");
      return;
    }
    if (step === "details" && (!caption || (global || locationId))) {
      if (!caption) {
        alert("Please add a caption.");
        return;
      }
      if (!global && !locationId) {
        alert("Please select a location.");
        return;
      }
    }

    const currentIdx = STEPS.indexOf(step);
    if (currentIdx < STEPS.length - 1) {
      setStep(STEPS[currentIdx + 1]);
    }
  };

  const handlePrev = () => {
    const currentIdx = STEPS.indexOf(step);
    if (currentIdx > 0) {
      setStep(STEPS[currentIdx - 1]);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setCaption("");
    setEventLabel("");
    setDescription("");
    setGlobal(false);
    setLocationId(activeLocationId ? String(activeLocationId) : "");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const canProceed = step === "upload" ? file : step === "details" ? caption && (global || locationId) : true;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* Step Indicator */}
        <div className="flex gap-2 mb-4">
          {STEPS.map((s, idx) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition ${
                STEPS.indexOf(step) >= idx
                  ? "bg-[var(--cc-primary)]"
                  : "bg-[var(--cc-border)]"
              }`}
            />
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Choose Photo"}
            {step === "details" && "Memory Details"}
            {step === "review" && "Review & Publish"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Select a high-quality photo to share"}
            {step === "details" && "Add details about this memory"}
            {step === "review" && "Preview your memory before publishing"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <>
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 rounded-lg object-cover"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById("file-input").click()}
                  >
                    Choose Different Photo
                  </Button>
                </div>
              ) : (
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--cc-border)] bg-[var(--cc-page)]">
                  <ImageIcon size={32} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-[var(--cc-text)]">Choose a photo</span>
                  <span className="text-xs text-muted-foreground">JPEG, PNG, or WEBP • Up to 5 MB</span>
                  <Input
                    id="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </label>
              )}
            </>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <>
              <Input
                value={caption}
                maxLength={240}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption (shown on the memory card)"
                className="h-10"
              />
              <Input
                value={eventLabel}
                maxLength={160}
                onChange={(e) => setEventLabel(e.target.value)}
                placeholder="Event / client name (optional)"
                className="h-10"
              />
              <textarea
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-20 rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm resize-none"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">Location</label>
                <select
                  value={locationId}
                  disabled={global}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm disabled:opacity-50"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              {canGlobal && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={global}
                    onChange={(e) => {
                      setGlobal(e.target.checked);
                      if (e.target.checked) setLocationId("");
                    }}
                  />
                  <span>Global memory</span>
                </label>
              )}
            </>
          )}

          {/* Step 3: Review */}
          {step === "review" && preview && (
            <div className="space-y-3">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 rounded-lg object-cover"
              />
              <div className="bg-[var(--cc-page)] rounded-lg p-3 space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Caption</p>
                  <p className="font-medium text-[var(--cc-text)]">{caption}</p>
                </div>
                {eventLabel && (
                  <div>
                    <p className="text-xs text-muted-foreground">Event</p>
                    <p className="font-medium text-[var(--cc-text)]">{eventLabel}</p>
                  </div>
                )}
                {description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="font-medium text-[var(--cc-text)] text-xs line-clamp-2">{description}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium text-[var(--cc-text)]">
                    {global ? "Global" : locations.find((l) => l.id === parseInt(locationId))?.name || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step !== "upload" && (
            <Button variant="outline" onClick={handlePrev} disabled={isSubmitting}>
              <CaretLeftIcon size={16} />
              Back
            </Button>
          )}
          {step !== "review" && (
            <Button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="flex-1 bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)]"
            >
              Next <CaretRightIcon size={16} />
            </Button>
          )}
          {step === "review" && (
            <Button
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onCreated({ file, caption, eventLabel, description, locationId, global });
                  handleClose();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="flex-1 bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)]"
            >
              {isSubmitting ? "Publishing…" : "Publish Memory"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
