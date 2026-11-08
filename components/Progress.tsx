"use client";
import { useEffect, useState } from "react";

/** Animates 0 -> value after mount so the fill visibly grows. */
function useGrow(value: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return v;
}

export function Ring({ paid, total, size = 64 }: { paid: number; total: number; size?: number }) {
  const frac = useGrow(total === 0 ? 1 : paid / total);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${paid} of ${total} paid`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--field)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={paid === total ? "var(--success-text)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
        {paid}/{total}
      </div>
    </div>
  );
}

export function Bar({ paid, total }: { paid: number; total: number }) {
  const frac = useGrow(total === 0 ? 1 : paid / total);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-field" role="img" aria-label={`${paid} of ${total} paid`}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${frac * 100}%`,
          background: paid === total ? "var(--success-text)" : "var(--accent)",
          transition: "width 700ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
    </div>
  );
}
