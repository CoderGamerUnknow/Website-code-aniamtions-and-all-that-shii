import { useId } from "react";
import PropTypes from "prop-types";

const R = (n) => Math.round(n * 100) / 100;

// The body gradient lives in the document, so every card needs its own id:
// a shared one left six identical ids in the DOM and made every card resolve
// the gradient of the first card on the page.
const useBodyGradientId = () =>
  `gpuBody-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

const bodyGradient = (id) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#242a1c" />
      <stop offset="55%" stopColor="#12150d" />
      <stop offset="100%" stopColor="#050604" />
    </linearGradient>
  </defs>
);

function Fan({ cx, cy, r, accent }) {
  const bladeCount = 7;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#0a0c07"
        stroke={accent}
        strokeWidth="3"
        strokeOpacity="0.55"
      />
      <g className="gpuFan">
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.78}
          fill="none"
          stroke={accent}
          strokeOpacity="0.35"
          strokeWidth={r * 0.3}
          strokeDasharray={`${R((2 * Math.PI * r * 0.78) / (bladeCount * 2.1))} ${R(
            (2 * Math.PI * r * 0.78) / bladeCount -
              (2 * Math.PI * r * 0.78) / (bladeCount * 2.1)
          )}`}
        />
        <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="2" />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.26} fill="#141a0e" stroke={accent} strokeWidth="3" strokeOpacity="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.08} fill={accent} />
    </g>
  );
}

Fan.propTypes = {
  cx: PropTypes.number.isRequired,
  cy: PropTypes.number.isRequired,
  r: PropTypes.number.isRequired,
  accent: PropTypes.string.isRequired,
};

function GpuBody({ fans, accent, badge, label }) {
  const isTriple = fans === 3;
  const fanR = isTriple ? 100 : 132;
  const centers = isTriple ? [165, 375, 585] : [218, 532];
  const fanY = 575;
  const gradientId = useBodyGradientId();

  return (
    <g>
      {bodyGradient(gradientId)}
      {/* soft glow */}
      <rect x="45" y="315" width="660" height="450" rx="30" fill={accent} opacity="0.07" />
      {/* PCI bracket */}
      <rect x="24" y="330" width="34" height="420" rx="6" fill="#2b3123" />
      <rect x="32" y="360" width="18" height="46" rx="4" fill="#0a0c07" />
      <rect x="32" y="422" width="18" height="46" rx="4" fill="#0a0c07" />
      {/* main body */}
      <rect x="58" y="330" width="634" height="420" rx="18" fill={`url(#${gradientId})`} stroke="#3d4a2f" strokeWidth="3" />
      {/* top strip */}
      <path d="M76 330 h598 a18 18 0 0 1 18 18 v48 H58 v-48 a18 18 0 0 1 18 -18 z" fill="#0d1009" />
      <text
        x="88"
        y="380"
        fill={accent}
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="700"
        fontSize="34"
        letterSpacing="7"
      >
        GEFORCE RTX
      </text>
      <text
        x="662"
        y="380"
        textAnchor="end"
        fill="#d7f5a5"
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="600"
        fontSize="26"
        letterSpacing="4"
      >
        {badge}
      </text>
      {/* fans */}
      {centers.map((cx) => (
        <Fan key={cx} cx={cx} cy={fanY} r={fanR} accent={accent} />
      ))}
      {/* vents */}
      <g stroke="#3d4a2f" strokeWidth="6" strokeLinecap="round">
        <line x1="86" y1="712" x2="180" y2="712" />
        <line x1="200" y1="712" x2="294" y2="712" />
        <line x1="456" y1="712" x2="550" y2="712" />
        <line x1="570" y1="712" x2="664" y2="712" />
      </g>
      {/* power connector hint */}
      <rect x="596" y="336" width="76" height="16" rx="4" fill="#1c2314" />
      {/* model label */}
      <text
        x="375"
        y="905"
        textAnchor="middle"
        fill="#eaffd0"
        fontFamily="'Orbitron', sans-serif"
        fontWeight="900"
        fontSize="84"
        letterSpacing="2"
      >
        {label}
      </text>
      <rect x="255" y="945" width="240" height="6" rx="3" fill={accent} />
    </g>
  );
}

GpuBody.propTypes = {
  fans: PropTypes.number,
  accent: PropTypes.string.isRequired,
  badge: PropTypes.string,
  label: PropTypes.string,
};

function Rack({ accent, badge, label }) {
  const units = Array.from({ length: 10 }, (_, i) => i);
  const gradientId = useBodyGradientId();
  return (
    <g>
      {bodyGradient(gradientId)}
      <rect x="115" y="120" width="520" height="800" rx="24" fill={accent} opacity="0.07" />
      <rect x="130" y="135" width="490" height="770" rx="18" fill={`url(#${gradientId})`} stroke="#3d4a2f" strokeWidth="3" />
      {/* header */}
      <text
        x="375"
        y="192"
        textAnchor="middle"
        fill={accent}
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="700"
        fontSize="36"
        letterSpacing="8"
      >
        NVIDIA
      </text>
      <text
        x="375"
        y="224"
        textAnchor="middle"
        fill="#d7f5a5"
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="600"
        fontSize="22"
        letterSpacing="5"
      >
        {badge}
      </text>
      {/* rack units */}
      {units.map((i) => {
        const y = 252 + i * 62;
        return (
          <g key={i}>
            <rect x="160" y={y} width="430" height="48" rx="8" fill="#10140c" stroke="#334022" strokeWidth="2" />
            <rect x="176" y={y + 14} width="180" height="6" rx="3" fill="#2b3a17" />
            <rect x="176" y={y + 26} width="120" height="6" rx="3" fill="#2b3a17" />
            <circle cx="556" cy={y + 24} r="6" fill={i % 3 === 0 ? accent : "#2f3d1c"} />
            <circle cx="534" cy={y + 24} r="6" fill={i % 4 === 0 ? accent : "#2f3d1c"} />
          </g>
        );
      })}
      {/* base */}
      <rect x="160" y="884" width="430" height="10" rx="5" fill="#2b3a17" />
      <text
        x="375"
        y="1000"
        textAnchor="middle"
        fill="#eaffd0"
        fontFamily="'Orbitron', sans-serif"
        fontWeight="900"
        fontSize="72"
        letterSpacing="2"
      >
        {label}
      </text>
      <rect x="255" y="1035" width="240" height="6" rx="3" fill={accent} />
    </g>
  );
}

Rack.propTypes = {
  accent: PropTypes.string.isRequired,
  badge: PropTypes.string,
  label: PropTypes.string,
};

function Chip({ accent, badge, label }) {
  const gradientId = useBodyGradientId();
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={196 + col * 92}
          y={366 + row * 92}
          width="76"
          height="76"
          rx="8"
          fill="#11160b"
          stroke={accent}
          strokeOpacity={row === 1 || col === 2 ? 0.85 : 0.3}
          strokeWidth="3"
        />
      );
    }
  }
  const pads = [];
  for (let i = 0; i < 9; i++) {
    pads.push(
      <rect key={`t${i}`} x={176 + i * 50} y="304" width="30" height="14" rx="4" fill="#3d4a2f" />,
      <rect key={`b${i}`} x={176 + i * 50} y="762" width="30" height="14" rx="4" fill="#3d4a2f" />,
      <rect key={`l${i}`} x="144" y={344 + i * 50} width="14" height="30" rx="4" fill="#3d4a2f" />,
      <rect key={`r${i}`} x="592" y={344 + i * 50} width="14" height="30" rx="4" fill="#3d4a2f" />
    );
  }
  return (
    <g>
      {bodyGradient(gradientId)}
      <rect x="120" y="280" width="510" height="510" rx="32" fill={accent} opacity="0.08" />
      <rect x="158" y="318" width="434" height="434" rx="20" fill={`url(#${gradientId})`} stroke={accent} strokeWidth="4" strokeOpacity="0.8" />
      {cells}
      {pads}
      <text
        x="375"
        y="556"
        textAnchor="middle"
        fill="#eaffd0"
        fontFamily="'Orbitron', sans-serif"
        fontWeight="900"
        fontSize="54"
      >
        AI
      </text>
      <text
        x="375"
        y="286"
        textAnchor="middle"
        fill={accent}
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="700"
        fontSize="26"
        letterSpacing="6"
      >
        {badge}
      </text>
      <text
        x="375"
        y="920"
        textAnchor="middle"
        fill="#eaffd0"
        fontFamily="'Orbitron', sans-serif"
        fontWeight="900"
        fontSize="74"
        letterSpacing="2"
      >
        {label}
      </text>
      <rect x="255" y="958" width="240" height="6" rx="3" fill={accent} />
    </g>
  );
}

Chip.propTypes = {
  accent: PropTypes.string.isRequired,
  badge: PropTypes.string,
  label: PropTypes.string,
};

export function ProductArt({ art = {}, name = "", className }) {
  const { variant = "gpu", fans = 3, accent = "#76B900", badge = "" } = art;
  // short label for the art (drop the "GeForce " prefix so it fits)
  const label = name.replace(/^GeForce /, "").replace("NVIDIA ", "");

  return (
    <svg
      viewBox="0 0 750 1094"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={name}
    >
      {variant === "rack" ? (
        <Rack accent={accent} badge={badge} label={label} />
      ) : variant === "chip" ? (
        <Chip accent={accent} badge={badge} label={label} />
      ) : (
        <GpuBody fans={fans} accent={accent} badge={badge} label={label} />
      )}
    </svg>
  );
}

ProductArt.propTypes = {
  // `art` describes the drawing: which body, how many fans, its accent and
  // the badge above the label.
  art: PropTypes.shape({
    variant: PropTypes.string,
    fans: PropTypes.number,
    accent: PropTypes.string,
    badge: PropTypes.string,
  }),
  name: PropTypes.string,
  className: PropTypes.string,
};
