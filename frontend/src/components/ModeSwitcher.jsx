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
      viewBox="0 0 195 171"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M161.776 8.73926C163.338 8.31853 166.324 8.25303 168.186 8.59863C170.242 8.98046 172.854 10.3882 174.427 11.9629C176.851 14.3896 178.441 18.6287 178.23 22.0996L178.139 23.6113L180.74 23.5996C185.068 23.5806 188.024 24.7775 190.723 27.6416C192.422 29.4453 193.362 31.1312 193.953 33.4346C195.067 37.7783 193.58 42.7834 190.163 46.1924C188.189 48.1615 186.106 49.2505 183.232 49.8174L181.177 50.2236L176.852 49.6768L174.912 48.7676C172.138 47.4674 171.676 47.3578 170.317 47.6787C168.437 48.1231 166.309 49.7051 162.396 53.5654C158.128 57.7755 154.892 61.3111 152.442 64.583C147.295 74.7008 149.713 85.0996 150.098 95.8682C150.598 109.868 158.098 136.868 125.098 160.368C105.148 174.575 97.6268 171.238 94.7959 163.175C94.7293 163.059 94.662 162.933 94.5977 162.796C93.279 159.98 93.2148 157.55 93.2148 157.55L93.1982 153.117C93.0704 150.269 93.0977 147.414 93.0977 144.868C93.0977 144.526 93.1195 144.157 93.1621 143.762L93.1406 137.896C93.0952 125.879 93.1648 117.026 93.3203 115.114C94.2421 103.792 98.8954 93.7707 107.365 84.8662C110.308 81.773 120.016 71.6471 123.836 67.6865C128.197 63.1643 136.56 54.4429 144.882 45.7402C153.51 36.7165 155.087 34.5724 155.108 31.8242L155.117 30.5859L154.117 28.9248C153.567 28.0113 152.871 26.7072 152.569 26.0273L152.021 24.792L151.8 19.5615L152.222 18.0977C153.558 13.4645 157.095 10.0001 161.776 8.73926ZM0.555664 0.81543C3.59137 0.111094 13.7228 -0.234867 19.2539 0.176758C32.1012 1.13278 42.6061 4.25718 51.1709 9.66895C51.182 9.67646 77.3396 27.3726 71.0977 48.3682C71.0977 48.3682 70.2866 52.4635 69.5977 55.3682C68.9087 58.2728 69.9343 60.8809 74.4668 65.9863C77.1919 68.7762 81.1665 73.4539 81.9912 74.8418L82.2188 75.2246L82.5918 74.8438L82.5977 74.8682C87.5775 70.7183 103.668 57.0801 122.371 55.3896C119.811 58.2424 113.713 64.7027 108.162 70.4043C103.992 74.6873 99.8256 79.0805 98.9033 80.167C93.0919 87.0148 88.4405 95.8202 85.6611 105.233C85.3168 106.399 85.0546 106.934 84.9355 106.717C84.8331 106.529 84.1689 104.818 83.46 102.914C78.6456 89.9861 73.1179 81.1543 64.873 73.2188C58.5112 67.0956 55.7461 65.6297 48.1504 64.3516C36.5888 62.4062 28.7718 59.6041 21.7021 54.8711C15.3093 50.5912 11.0944 45.7914 7.3125 38.4863C2.50103 29.1926 0.0105962 17.851 0.00292969 5.2041L0 0.944336L0.555664 0.81543Z"
        fill="currentColor"
      />
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
