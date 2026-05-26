import { useState } from "react";
import { ConfettiIcon } from "@phosphor-icons/react";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import NewPartyOrder from "@/pages/NewPartyOrder";

const FORM_ID = "party-order-drawer-form";

export default function PartyOrderBanner() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="text-primary">
          <ConfettiIcon weight="fill" className="size-9" />
        </div>
        <div>
          <h3 className="text-sm leading-6 font-semibold">
            Planning a Party or Team Lunch?
          </h3>
          <p className="text-sm text-muted-foreground">
            We'll take care of the food!
          </p>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger
          className={buttonVariants({ variant: "shadow-white", size: "lg" })}
        >
          <ConfettiIcon weight="fill" />
          Create Party Order
        </DrawerTrigger>

        {/*
          Bottom-sheet layout:
            • max-h-[92dvh] — never taller than the viewport
            • flex flex-col  — header + body + footer stacked
            • px-0           — let inner sections own their padding
        */}
        <DrawerContent className="flex flex-col max-h-[92dvh] px-0 rounded-t-[24px]">
          {/* ── Sticky header ─────────────────────────────────────────── */}
          <DrawerHeader className="shrink-0 px-4 pt-4 pb-3 border-b border-border/50">
            <DrawerTitle className="font-semibold text-base">
              Create Party Order
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              Tell us about your event and preferred menu.{" "}
              We'll get back to you with an estimate.
            </DrawerDescription>
          </DrawerHeader>

          {/* ── Scrollable body ───────────────────────────────────────── */}
          {/* -webkit-overflow-scrolling: touch gives momentum on iOS     */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <NewPartyOrder
              formId={FORM_ID}
              hideSubmitButton
              onClose={() => setOpen(false)}
              onPendingChange={setPending}
            />
          </div>

          {/* ── Sticky CTA footer ─────────────────────────────────────── */}
          {/*
            pb uses env(safe-area-inset-bottom) so the button clears
            the iOS home indicator and Android gesture bar.
          */}
          <div
            className="shrink-0 px-4 pt-3 border-t border-border/50 bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <Button
              type="submit"
              form={FORM_ID}
              className="w-full h-12 text-sm font-medium"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Request Estimate"}
            </Button>
            <DrawerClose
              className={buttonVariants({
                variant: "ghost",
                className: "w-full mt-2 h-10 text-muted-foreground",
              })}
            >
              Cancel
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
