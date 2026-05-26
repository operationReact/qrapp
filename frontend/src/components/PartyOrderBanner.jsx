import { useState } from "react";
import { ConfettiIcon } from "@phosphor-icons/react";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
        <DrawerContent className="px-4 md:max-w-md md:mx-auto">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold text-center">
              Create Party Order
            </DrawerTitle>
            <DrawerDescription>
              Tell us about your event and preferred menu.
              <br />
              We'll get back to you with an estimate.
            </DrawerDescription>
          </DrawerHeader>

          <div
            className="no-scrollbar flex-1 overflow-y-auto px-1 py-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <NewPartyOrder
              formId={FORM_ID}
              hideSubmitButton
              onClose={() => setOpen(false)}
              onPendingChange={setPending}
            />
          </div>

          <DrawerFooter className="px-2">
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Request Estimate"}
            </Button>
            <DrawerClose
              className={buttonVariants({
                variant: "ghost",
                className: "w-full",
              })}
            >
              Cancel
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
