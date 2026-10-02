import React, { useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const SOURCE_BADGES = {
  CUSTOMER: { label: "Customer Memory", color: "bg-blue-500" },
  ADMIN_CURATED: { label: "Bro & Bro Curated", color: "bg-amber-500" },
};

export function CustomerMemoryDetailView({ open, onOpenChange, memory }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [imageFailed, setImageFailed] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!memory) return null;

  const ContentComponent = isMobile ? DrawerContent : DialogContent;
  const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
  const TitleComponent = isMobile ? DrawerTitle : DialogTitle;
  const badge = SOURCE_BADGES[memory.sourceType];

  const content = (
    <>
      <HeaderComponent className="pb-0">
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-4"
          >
            <ArrowLeftIcon size={20} />
          </Button>
        )}
        <TitleComponent className="text-base md:text-lg">
          {memory.caption || memory.eventLabel || "A Happy Memory"}
        </TitleComponent>
      </HeaderComponent>

      <div className={`px-4 md:px-6 py-4 space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* IMAGE */}
        <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
          {imageFailed ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Image unavailable
            </div>
          ) : (
            <>
              <img
                src={memory.imageUrl}
                alt={memory.caption || "Memory"}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
              {badge && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  <span className={`inline-block w-2 h-2 rounded-full ${badge.color}`} />
                  {badge.label}
                </span>
              )}
            </>
          )}
        </div>

        {/* MEMORY DETAILS */}
        <div className="space-y-4">
          {/* Caption */}
          {memory.caption && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Caption</h3>
              <p className="text-base font-medium text-foreground">
                {memory.caption}
              </p>
            </div>
          )}

          {/* Description */}
          {memory.description && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Description</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {memory.description}
              </p>
            </div>
          )}

          {/* Location */}
          {memory.locationName && !memory.global && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Location</h3>
              <p className="text-sm text-foreground">
                {memory.locationName}
              </p>
            </div>
          )}

          {memory.global && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Visibility</h3>
              <p className="text-sm text-foreground">
                Featured Across All Locations
              </p>
            </div>
          )}

          {/* Event Information */}
          {memory.eventLabel && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Event</h3>
              <p className="text-sm text-foreground">
                {memory.eventLabel}
              </p>
            </div>
          )}

          {memory.eventType && !memory.eventLabel && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Event Type</h3>
              <p className="text-sm text-foreground capitalize">
                {memory.eventType.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
          )}

          {/* Published Date */}
          {memory.publishedAt && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Published</h3>
              <p className="text-sm text-foreground/70">
                {new Date(memory.publishedAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {content}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[20px]">
        {content}
      </DialogContent>
    </Dialog>
  );
}
