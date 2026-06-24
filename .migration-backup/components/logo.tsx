'use client'
import { useEffect, useRef } from "react";

const PETAL_PATH =
  "M 36.48 20.80 L 36.48 415.45 C 36.48 415.45, 69.11 334.13, 131.77 272.76 C 187.61 218.07, 192.77 195.76, 195.54 162.79 C 203.09 72.60, 36.48 20.80, 36.48 20.80 Z";

const PETAL_PERIMETER = 900;

const petals = [
  { id: "p1", transform: "translate(-16.76px,-26.56px) scale(0.656)", delay: "0s" },
  { id: "p2", transform: "translate(22.13px,-35.03px) rotate(91.097deg) scale(0.656)", delay: "0.18s" },
  { id: "p3", transform: "translate(-7.46px,11.56px) rotate(-90deg) scale(0.656)", delay: "0.36s" },
  { id: "p4", transform: "translate(30.66px,1.13px) rotate(-180deg) scale(0.656)", delay: "0.54s" },
];

const keyframes = `
  @keyframes petalDraw {
    0%   { stroke-dashoffset: ${PETAL_PERIMETER};  fill-opacity: 0;    }
    40%  { stroke-dashoffset: 0;                   fill-opacity: 0.15; }
    60%  { stroke-dashoffset: 0;                   fill-opacity: 0.15; }
    100% { stroke-dashoffset: ${-PETAL_PERIMETER}; fill-opacity: 0;    }
  }
  @keyframes petalReveal {
    0%   { stroke-dashoffset: ${PETAL_PERIMETER}; fill-opacity: 0; }
    100% { stroke-dashoffset: 0;                  fill-opacity: 1; }
  }
`;

export default function PinwheelLoader({
  size = 120,
  color = "currentColor",
  duration = 2.4,
  isDone = false,
  isfill,
  stkw
}: {
  size ? : number;
  color ? : string;
  duration ? : number;
  isDone ? : boolean;
  isfill ? : boolean;
  stkw?:number
}) {
  const styleRef = useRef < HTMLStyleElement | null > (null);
  
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
      aria-label={isDone ? "Done" : "Loading"}
      role="status"
    >
      <g transform="translate(340,340)">
        {petals.map((petal, i) => (
          <g
            key={petal.id}
            style={{
              transform: petal.transform,
              transformOrigin: "0px 0px",
            }}
          >
            <path
              fill={isfill ? 'currentColor' : 'none'  }
              stroke={color}
              strokeWidth={!isDone ? (stkw || 25) : 0}
              strokeLinejoin="arcs"
              strokeDasharray={PETAL_PERIMETER}
              d={PETAL_PATH}
              style={
                isDone
                  ? {
                      // Draw each petal in fully, staggered, then stay solid
                      animation: `petalReveal 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s both`,
                    }
                  : {
                      animation: `petalDraw ${duration}s cubic-bezier(0.4,0,0.2,1) ${petal.delay} infinite`,
                      fillOpacity: 0,
                      strokeDashoffset: PETAL_PERIMETER,
                    }
              }
            />
          </g>
        ))}
      </g>
    </svg>
  );
}