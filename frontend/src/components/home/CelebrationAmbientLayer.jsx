import { memo, useId, useMemo } from "react";
import PropTypes from "prop-types";
import { createConfettiParticles, getCelebrationPreset } from "./campaignPresentation";

const WAVE_PATH = "M0 30 C100 -8 200 68 300 30 S500 -8 600 30 S800 68 900 30 S1100 -8 1200 30";

function Wave({ gradientId, wave }) {
  return (
    <div
      className="celebration-wave"
      style={{
        bottom: `${wave.bottom}%`,
        height: `${wave.height}%`,
        "--wave-duration": `${wave.durationSeconds}s`,
        "--wave-direction": wave.reverse ? "reverse" : "normal",
        "--wave-opacity": wave.opacity,
      }}
    >
      <svg viewBox="0 0 2400 60" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            {wave.stops.map((color, index) => (
              <stop key={color + index} offset={index / (wave.stops.length - 1)} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <g
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={wave.strokeWidth}
          transform={wave.flip ? "translate(0 60) scale(1 -1)" : undefined}
        >
          <path d={WAVE_PATH} vectorEffect="non-scaling-stroke" />
          <path d={WAVE_PATH} transform="translate(1200 0)" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}

Wave.propTypes = {
  gradientId: PropTypes.string.isRequired,
  wave: PropTypes.shape({
    bottom: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    durationSeconds: PropTypes.number.isRequired,
    reverse: PropTypes.bool,
    flip: PropTypes.bool,
    opacity: PropTypes.number.isRequired,
    strokeWidth: PropTypes.number.isRequired,
    stops: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};

/**
 * Decorative, pointer-events-none confetti + wave layer driven purely by CSS.
 * Particles are generated once; `active` only toggles animation-play-state, so the
 * DOM is never rebuilt and loops never restart on parent re-renders.
 */
function CelebrationAmbientLayer({ presetName, active }) {
  const baseId = useId().replace(/:/g, "");
  const preset = useMemo(() => getCelebrationPreset(presetName), [presetName]);
  const particles = useMemo(() => (preset ? createConfettiParticles(preset) : []), [preset]);
  if (!preset) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="celebration-ambient-layer"
      data-active={active ? "true" : "false"}
      className="celebration-layer"
      style={{ "--celebration-opacity": preset.opacity }}
    >
      {preset.animations.includes("WAVE_FLOW") &&
        preset.waves.map((wave) => (
          <Wave key={wave.id} gradientId={`${baseId}-${wave.id}`} wave={wave} />
        ))}
      {preset.animations.includes("CONFETTI") &&
        particles.map((particle) => (
          <span
            key={particle.id}
            className={`celebration-confetti celebration-confetti-${particle.shape}${particle.burst ? " celebration-confetti-burst" : ""}`}
            style={{
              left: `${particle.left.toFixed(2)}%`,
              width: particle.shape === "strip" ? Math.max(3, particle.size - 3) : particle.size,
              height: particle.shape === "strip" ? Math.round(particle.size * 2.2) : particle.size,
              backgroundColor: particle.color,
              animationDuration: `${particle.duration.toFixed(2)}s`,
              animationDelay: `${particle.delay.toFixed(2)}s`,
              "--confetti-opacity": particle.opacity,
              "--confetti-drift": `${particle.drift}px`,
              "--confetti-rotation": `${particle.rotation}deg`,
              "--confetti-spin": `${particle.spin}deg`,
            }}
          />
        ))}
    </div>
  );
}

CelebrationAmbientLayer.propTypes = {
  presetName: PropTypes.string.isRequired,
  active: PropTypes.bool,
};

export default memo(CelebrationAmbientLayer);
