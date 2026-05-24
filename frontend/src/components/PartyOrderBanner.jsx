import { ConfettiIcon, MusicNotesIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { BowlFoodIcon } from "@phosphor-icons/react/dist/ssr";
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
    <div className="relative bg-primary overflow-clip rounded-xl ring-2 ring-primary/10 shadow-md shadow-primary/20 p-6 cursor-pointer group">
      <div aria-hidden className="gradient-circle absolute inset-0 opacity-5" />

      <div className="absolute -right-4 -top-4 text-7xl opacity-20 rotate-12 select-none pointer-events-none">
        <BowlFoodIcon />
      </div>
      <div className="absolute right-20 -bottom-3 text-5xl opacity-15 -rotate-12 select-none pointer-events-none">
        🎉
        <MusicNotesIcon />
      </div>
      <div className="absolute -left-2 bottom-2 text-4xl opacity-10 rotate-6 select-none pointer-events-none">
        <BowlFoodIcon />
      </div>

      <div className="grid relative gap-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">
            Planning an Event?
          </h3>
          <p className="mt-1 text-secondary">
            Submit a party order request and we'll prepare everything for you
          </p>
        </div>

        <Drawer>
          <DrawerTrigger
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-12 border-border!",
            })}
          >
            Create Party Order
            <ConfettiIcon weight="fill" />
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
            <NewPartyOrder className="w-full max-w-md mx-auto"/>
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
    </div>
  );
}
