import { ConfettiIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
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

export default function PartyOrderBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className=" text-primary">
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

      <Drawer>
        <DrawerTrigger
          className={buttonVariants({
            variant: "shadow-white",
            size: "lg",
          })}
        >
          <ConfettiIcon weight="fill" />
          Create Party Order
        </DrawerTrigger>
        <DrawerContent className="px-4">
          <DrawerHeader>
            <DrawerTitle className="font-semibold">
              Create Party Order
            </DrawerTitle>
            <DrawerDescription>
              {" "}
              Tell us about your event and preferred menu.
              <br /> We'll get back to you with an estimate.
            </DrawerDescription>
          </DrawerHeader>
          <NewPartyOrder className="w-full max-w-md mx-auto" />
          <DrawerFooter className="px-0">
            <DrawerClose
              className={buttonVariants({
                variant: "ghost",
                className: "w-full",
              })}
            >
              Close
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
