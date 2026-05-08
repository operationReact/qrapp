import { motion, AnimatePresence } from "motion/react";
import { Drumstick, Carrot } from "lucide-react";
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
import {
  Carrot as BoxIconCarrot,
  TurkeyMeat as BoxIconDrumstick,
} from "@boxicons/react";
import { usePreferences } from "@/context/PreferencesContext";

function AllEnabledIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 19"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M9.45019 9C10.031 9.0002 10.5 9.44679 10.5 10C10.5 10.3733 10.2826 10.6929 9.96777 10.8662L10.6611 11.8535C12.3898 12.347 13.6562 13.8605 13.6562 15.667H15.0566C15.0566 13.367 13.516 11.4068 11.3672 10.6602C12.5711 9.45349 14.3287 8.82687 16.1416 9.04688C18.7172 9.36703 20.7954 11.4672 20.9844 13.9404C21.0473 14.7801 20.9149 15.5998 20.5791 16.3662C19.8862 17.9662 18.1989 19 16.2881 19H10.8564C8.74973 18.9732 7.04199 17.3329 7.04199 15.333C7.04212 13.9133 7.90289 12.7004 9.14843 12.0938L8.70117 11.4531C8.51918 11.5865 8.30162 11.667 8.05664 11.667H8.0498C7.46901 11.6669 7.00018 11.2201 7 10.667C7 10.3391 7.16481 10.0484 7.41992 9.86621C7.4285 9.86008 7.43751 9.85452 7.44629 9.84863C7.51666 9.80151 7.59311 9.7621 7.6748 9.73242C7.68021 9.73045 7.68596 9.72943 7.6914 9.72754C7.71109 9.72074 7.73075 9.7137 7.75097 9.70801C7.76581 9.70381 7.78079 9.69987 7.7959 9.69629C7.8451 9.68469 7.89557 9.67565 7.94726 9.6709C7.98097 9.66777 8.01522 9.66701 8.0498 9.66699L8.15332 9.67188C8.19935 9.67624 8.24432 9.68353 8.28808 9.69336C8.2979 9.69556 8.30769 9.69773 8.31738 9.7002C8.36015 9.71108 8.40152 9.72461 8.4414 9.74023C8.46943 9.63978 8.51393 9.54588 8.57129 9.46094C8.57882 9.44967 8.58673 9.43869 8.59472 9.42773C8.6172 9.39722 8.64115 9.36771 8.66699 9.33984C8.68257 9.32289 8.69909 9.30692 8.71582 9.29102C8.73226 9.27551 8.75009 9.26153 8.76758 9.24707C8.79511 9.22416 8.82356 9.2027 8.85351 9.18262C8.86048 9.17795 8.86693 9.17248 8.87402 9.16797L8.875 9.16895C9.04015 9.06399 9.23694 9 9.45019 9Z" />
      <path d="M10.9893 1.83496L12.6113 0.212891L13.6103 1.21094L13.5889 1.21875L11.9668 2.84082H13.8018V4.25684H12.2295C12.3215 4.54712 12.3847 4.84473 12.3848 5.15625C12.3848 6.46572 11.7963 7.67626 10.7822 8.4834C10.4852 8.23581 10.1179 8.07089 9.72265 8.01855C9.43912 7.96549 8.72949 7.97813 8.15918 8.45312C8.07478 8.52063 7.99459 8.59371 7.92187 8.67383C7.44615 8.70322 6.93079 8.62721 6.5 9C5.88012 9.53642 6.00586 10.543 6.00586 10.543L6 10.667L6.01074 10.8789C6.03288 11.0889 6.08829 11.2866 6.16992 11.4688L3 13.5078C2.68131 13.7131 2.31232 13.8125 1.95117 13.8125C1.44853 13.8124 0.945581 13.6212 0.570309 13.2461C-0.0739376 12.6017 -0.187726 11.5744 0.307614 10.8096L5.09668 3.36426C5.88281 2.14642 7.22127 1.41728 8.67285 1.41699C8.98439 1.41699 9.28293 1.48024 9.57324 1.57227V0H10.9893V1.83496Z" />
    </svg>
  );
}

const BUTTON_MODE_ICON = {
  all: AllEnabledIcon,
  veg: BoxIconCarrot,
  nonveg: BoxIconDrumstick,
};

const MODES = [
  {
    id: "all",
    icon: AllEnabledIcon,
    description: "All",
    color: "#F8F8F8",
    activeIconColor: "#000000",
  },
  {
    id: "veg",
    icon: BoxIconCarrot,
    description: "Veg",
    color: "#34C759",
    activeIconColor: "#34C759",
  },
  {
    id: "nonveg",
    icon: BoxIconDrumstick,
    description: "Non-Veg",
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
          className={`transition-colors bg-white/20 py-0.5 px-2 text-xs! font-bold! tracking-wider uppercase rounded-full flex items-center justify-center h-11 gap-1`}
          style={{
            border: `2px solid ${currentMode.color}`,
            color: activeMode !== "veg" ? currentMode.activeIconColor : "white",
            backgroundColor: activeMode === "veg" ? currentMode.color : "white",
          }}
          layoutId={activeMode}
        >
          <ActiveModeIcon pack="filled" size={24} className={`size-6`} />
          <span>{currentMode.description}</span>
        </motion.button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-2xl font-semibold">
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
                        <Icon size={32} className="size-[32px]" pack="filled" />
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
