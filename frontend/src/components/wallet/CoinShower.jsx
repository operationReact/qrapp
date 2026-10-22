import { motion } from "motion/react";

const MotionSpan = motion.span;
const COIN_COUNT = 22;
const FALL_DISTANCE = 340;

const coinStyle = {
  background:
    "radial-gradient(circle at 35% 30%, #fff3b0 0%, #f5c542 45%, #c8901a 100%)",
  boxShadow: "inset 0 0 0 2px #e0a92e, 0 2px 4px rgba(120,80,0,0.35)",
};

export default function CoinShower({ onDone }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg"
    >
      {Array.from({ length: COIN_COUNT }, (_, i) => {
        const left = (i * 37) % 96;
        const delay = (i % 7) * 0.08;
        const size = 14 + (i % 3) * 4;
        return (
          <MotionSpan
            key={i}
            className="absolute top-0 rounded-full"
            style={{ ...coinStyle, left: `${left}%`, width: size, height: size }}
            initial={{ y: -30, opacity: 0, rotate: 0 }}
            animate={{
              y: FALL_DISTANCE,
              opacity: [0, 1, 1, 0],
              rotate: 360 * (i % 2 === 0 ? 1 : -1),
            }}
            transition={{ duration: 1.6, delay, ease: "easeIn" }}
            onAnimationComplete={i === COIN_COUNT - 1 ? onDone : undefined}
          />
        );
      })}
    </div>
  );
}
