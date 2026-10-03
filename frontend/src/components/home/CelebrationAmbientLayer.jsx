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
function PartyIcon({ icon }) {
  const common = { width: icon.size, height: icon.size, viewBox: "0 0 24 24", focusable: "false", fill: icon.color };
  let shape;
  switch (icon.kind) {
    case "star":
      shape = <path d="M12 2l2.6 6.4 6.9.6-5.2 4.5 1.6 6.7L12 16.6 6.1 20.2l1.6-6.7L2.5 9l6.9-.6z" />;
      break;
    case "heart":
      shape = <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.8 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" />;
      break;
    case "balloon":
      shape = (
        <>
          <ellipse cx="12" cy="9" rx="6" ry="7.5" />
          <path d="M12 16.5l-1.6 2.2h3.2z" />
          <path d="M12 19c-1.5 1.4 1.5 2.2 0 3.5" fill="none" stroke={icon.color} strokeWidth="1" />
        </>
      );
      break;
    case "ribbon":
      shape = <path d="M2 14c3-6 6-6 10 0s7 6 10 0v3c-3 6-6 6-10 0s-7-6-10 0z" />;
      break;
    case "burst":
      shape = <path d="M12 1l1.8 7.2L21 6l-5.2 5.2L23 13l-7.2 1.8L18 22l-6-4.4L6 22l2.2-7.2L1 13l7.2-1.8L3 6l7.2 2.2z" />;
      break;
    default:
      // party popper: cone plus sparks
      shape = (
        <>
          <path d="M3 21l5-14 9 9z" />
          <path d="M14 3v3M19 8h3M17 5l2-2" fill="none" stroke={icon.color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="14" r="1.4" />
        </>
      );
  }
  return <svg {...common}>{shape}</svg>;
}

PartyIcon.propTypes = {
  icon: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
  }).isRequired,
};

function CelebrationAmbientLayer({ presetName, active, intensity, className = "" }) {
  const baseId = useId().replace(/:/g, "");
  const preset = useMemo(() => getCelebrationPreset(presetName, intensity), [presetName, intensity]);
  const particles = useMemo(() => (preset ? createConfettiParticles(preset) : []), [preset]);
  if (!preset) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="celebration-ambient-layer"
      data-active={active ? "true" : "false"}
      className={`celebration-layer ${className}`.trim()}
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
      {preset.animations.includes("PARTY_ICONS") &&
        (preset.partyIcons ?? []).map((icon, index) => (
          <span
            key={`${icon.kind}-${index}`}
            className="celebration-icon"
            data-testid="celebration-party-icon"
            style={{
              left: `${icon.left}%`,
              top: `${icon.top}%`,
              "--icon-duration": `${icon.duration}s`,
              "--icon-delay": `${icon.delay}s`,
              "--icon-opacity": icon.opacity,
              "--icon-tilt": `${index % 2 ? 4 : -4}deg`,
            }}
          >
            <PartyIcon icon={icon} />
          </span>
        ))}
    </div>
  );
}

CelebrationAmbientLayer.propTypes = {
  presetName: PropTypes.string.isRequired,
  active: PropTypes.bool,
  intensity: PropTypes.string,
  className: PropTypes.string,
};

export default memo(CelebrationAmbientLayer);
