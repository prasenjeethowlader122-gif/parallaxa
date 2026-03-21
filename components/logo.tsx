import { useEffect, useRef } from "react";

const PETAL_PATH =
  "M 36.48 20.80 L 36.48 415.45 C 36.48 415.45, 69.11 334.13, 131.77 272.76 C 187.61 218.07, 192.77 195.76, 195.54 162.79 C 203.09 72.60, 36.48 20.80, 36.48 20.80 Z";

const petals = [
  { id: "p1", transform: "translate(-16.76px,-26.56px) scale(0.656)", delay: "0s" },
  { id: "p2", transform: "translate(22.13px,-35.03px) rotate(91.097deg) scale(0.656)", delay: "0.18s" },
  { id: "p3", transform: "translate(-7.46px,11.56px) rotate(-90deg) scale(0.656)", delay: "0.36s" },
  { id: "p4", transform: "translate(30.66px,1.13px) rotate(-180deg) scale(0.656)", delay: "0.54s" },
];

const keyframes = `
  @keyframes petalIn {
    0%   { opacity: 0; transform: var(--petal-transform) scale(0); }
    30%  { opacity: 1; transform: var(--petal-transform); }
    70%  { opacity: 1; transform: var(--petal-transform); }
    100% { opacity: 0; transform: var(--petal-transform) scale(0); }
  }
`;

export default function PinwheelLoader({ size = 120, color = "currentColor", duration = 2.4 }) {
  const styleRef = useRef(null);
  
  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement("style");
      style.textContent = keyframes;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 780 780"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
      role="status"
    >
      <g transform="translate(340,340)">
        {petals.map((petal) => (
          <g
            key={petal.id}
            style={{
              "--petal-transform": petal.transform,
              transform: petal.transform,
              transformOrigin: "0px 0px",
              animation: `petalIn ${duration}s cubic-bezier(0.4,0,0.2,1) ${petal.delay} infinite`,
            }}
          >
            <path fill={color} d={PETAL_PATH} />
          </g>
        ))}
      </g>
    </svg>
  );
}