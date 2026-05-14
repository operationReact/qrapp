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
import { Button } from "./ui/button";
import { usePreferences } from "@/context/PreferencesContext";
import { FishIcon, PlantIcon, ToggleRightIcon } from "@phosphor-icons/react";

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
    color: "transparent",
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
        <motion.button
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
                borderColor: activeMode === "all" ? "#F0F0F0" : "transparent",
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
          <DrawerClose asChild>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 font-medium!"
            >
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
