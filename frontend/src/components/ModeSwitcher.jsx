import { motion, AnimatePresence } from "motion/react";
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
import { Button, buttonVariants } from "./ui/button";
import { usePreferences } from "@/context/PreferencesContext";
import {
  FishIcon,
  LeafIcon,
  PlantIcon,
  ToggleRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

function AllEnabledIcon() {
  return <span className="font-semibold">All</span>;
}

const BUTTON_MODE_ICON = {
  all: AllEnabledIcon,
  veg: PlantIcon,
  nonveg: FishIcon,
};

const MODES = [
  {
    id: "all",
    icon: AllEnabledIcon,
    description: "All",
    color: "#FFF",
    activeIconColor: "#000000",
  },
  {
    id: "veg",
    icon: PlantIcon,
    description: "Veg",
    color: "#22a108",
    activeIconColor: "#34C759",
  },
  {
    id: "nonveg",
    icon: FishIcon,
    description: "N-Veg",
    color: "#FF3B30",
    activeIconColor: "#FF3B30",
  },
];

export default function ModeSwitcher() {
  const { preferences, setPreferences } = usePreferences();

  const activeMode = preferences.segmentedFilter;
  const activeIdx = MODES.findIndex(
    (m) => m.id === preferences.segmentedFilter,
  );
  const currentMode = MODES[activeIdx];

  const pillWidth = 340;
  const pillHeight = 80;
  const knobSize = 64;
  const padding = (pillHeight - knobSize) / 2;

  // Calculate horizontal positions for the knob
  // Start: 8px, End: 340 - 64 - 8 = 268px. Middle: (8 + 268) / 2 = 138px.
  const firstPos = padding;
  const lastPos = pillWidth - knobSize - padding;
  const step = (lastPos - firstPos) / (MODES.length - 1);

  const ActiveModeIcon = BUTTON_MODE_ICON[activeMode];

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {/* <motion.button
          className={`active:scale-95 transition-[colors,transform] border-2 border-transparent shadow-sm group/mode rounded-md flex items-center justify-center size-12 gap-1 aspect-square`}
          style={{
            borderColor:
              activeMode === "all" ? "transparent" : `${currentMode.color}`,
            color: "white",
            backgroundColor: activeMode === "all" ? "white" : currentMode.color,
            padding: activeMode === "all" ? "0.25rem" : "0.25rem 0.5rem",
          }}
          layoutId={activeMode}
        >
          {activeMode === "all" ? (
            <span className="grid gap-0.5">
              <span>
                <ToggleRightIcon
                  weight="fill"
                  className={`size-10 group-hover/mode:text-primary transition-colors text-zinc-700`}
                />
              </span>
              <span className="text-[10px] uppercase font-black tracking-wide text-center text-zinc-700 pb-px leading-4 -mt-2">
                Mode
              </span>
            </span>
          ) : (
            <>
              <span className="grid place-items-center gap-0.5">
                <span>
                  <ActiveModeIcon weight="fill" className={`size-6`} />
                </span>
                <span className="text-[10px] uppercase font-black tracking-wide text-center text-nowrap pb-px leading-4">
                  {currentMode.description}
                </span>
              </span>
            </>
          )}
        </motion.button>*/}
        <motion.button
          layout
          className="relative text-xs grid grid-cols-[auto_auto_auto] font-semibold rounded-sm border bg-zinc-100 p-0.5"
        >
          <span
            className={cn(
              "rounded-sm text-zinc-700 text-center h-8 grid place-items-center px-2",
              activeMode === "all" && "bg-background text-foreground shadow-sm",
            )}
          >
            ALL
          </span>
          <span
            className={cn(
              "rounded-sm text-accent-400 flex items-center justify-center gap-0.5 text-center h-8 px-2",
              activeMode === "veg" && "bg-accent-400 text-background shadow-sm",
            )}
          >
            <LeafIcon className="size-4" weight="fill" /> VEG
          </span>
          <span
            className={cn(
              "rounded-sm text-red-500 flex items-center justify-center gap-1 text-center h-8 px-2",
              activeMode === "nonveg" && "bg-red-500 text-background shadow-sm",
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              width="16px"
              height="16px"
              viewBox="0 0 512 512"
            >
              <path d="M471.06 57.57C439.88 22.15 395.32 1.26 348.12-.01c-1.66-.03-3.41-.07-5.09-.07-45.34 0-88.88 17.91-121.1 49.79C195.34 76.13 160 119.38 160 189.73v60.42l-43.7 43.77c-1.93 1.88-5.75 1-7.75.17a79.418 79.418 0 0 0-29.3-5.62c-43.72 0-79.19 35.46-79.19 79.19 0 20.98 8.34 41.12 23.16 55.96a76.471 76.471 0 0 0 43.57 21.59 76.45 76.45 0 0 0 21.57 43.55A79.207 79.207 0 0 0 144.4 512c43.73 0 79.19-35.46 79.19-79.19 0-10.05-1.93-20.05-5.65-29.38-1-2.5-1.56-6 .16-7.75l43.74-43.76H323c38.72 0 72.75-10.17 104-31.08 46.22-30.88 76.69-79.36 83.56-133 6.22-48.32-7.81-94.58-39.5-130.27zM256.12 178.69c-.06 13.2-10.8 23.87-24 23.82-13.2-.05-24.48-10.82-23.81-24 2.86-56.07 53.15-119.85 110.23-128.59 13.03-2 24.77 8.43 26.01 21.56 1.24 13.15-8.42 24.82-21.56 26.07-27.62 2.62-66.74 52.65-66.87 81.14zm-82.75 242.57c1.48 3.68 2.24 7.62 2.24 11.59 0 17.16-13.91 31.07-31.07 31.07h-.11c-12 0-27.64-7.82-30.11-25.39l-5-35.8-35.81-5.05C56 395.2 48 379.61 48 367.57v-.02c0-17.19 13.94-31.13 31.13-31.13 3.89 0 7.75.73 11.37 2.15 7.14 2.9 14.78 4.4 22.5 4.42h.23c13.85 0 27.17-5.45 37.04-15.17l20.43-20.45a84.89 84.89 0 0 0 34.01 33.87l-20.49 20.5c-15.3 15.24-19.43 38.05-10.84 59.52h-.01z" />
            </svg>
            NON VEG
          </span>
        </motion.button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold">
            Switch Mode
          </DrawerTitle>
          <DrawerDescription>Choose Your Preference</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col items-center justify-center px-12 pt-0 pb-8 bg-white rounded-[40px] w-full max-w-[500px]">
          {/* Main Slider Pill */}
          <div className="relative mb-6">
            <motion.div
              animate={{
                backgroundColor: currentMode.color,
                borderColor: activeMode === "all" ? "#F0F0F0" : "#FFF",
              }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="h-[80px] rounded-full border-[1.5px] flex items-center relative"
              style={{ width: `${pillWidth}px` }}
            >
              {/* Active Knob */}
              <motion.div
                animate={{
                  x: firstPos + activeIdx * step,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute left-0 size-[64px] bg-white rounded-full z-10 shadow-[0_4px_12px_rgba(0,0,0,0.09)] flex items-center justify-center pointer-events-none"
              />

              {/* Icon Buttons */}
              <div className="absolute inset-0 z-20">
                {MODES.map((mode, idx) => {
                  const isActive = activeMode === mode.id;
                  const Icon = mode.icon;

                  // Logical center of each mode's area
                  const targetX = firstPos + idx * step + knobSize / 2;

                  return (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          segmentedFilter: mode.id,
                        })
                      }
                      className="absolute top-0 bottom-0 flex items-center justify-center cursor-pointer outline-none group"
                      style={{
                        left: `${targetX}px`,
                        transform: "translateX(-50%)",
                        width: `${knobSize}px`, // Hit area matches knob size
                      }}
                    >
                      <motion.div
                        animate={{
                          color: isActive
                            ? mode.activeIconColor
                            : activeMode === "all"
                              ? "#D1D5DB"
                              : "rgba(255,255,255,0.7)",
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon
                          weight="fill"
                          size={32}
                          className="size-8"
                          pack="filled"
                        />
                      </motion.div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Status Description Text */}
          <div className="h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-gray-500 text-[15px] font-medium"
              >
                {currentMode.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "border-border!",
            })}
          >
            Close
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
