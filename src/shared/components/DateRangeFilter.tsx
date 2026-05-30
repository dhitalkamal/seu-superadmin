import { useState, useRef, useEffect } from "react";
import { MS } from "@/shared/components/v8";

type Range = "7d" | "30d" | "90d" | "12mo" | "all";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12mo", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

type Props = {
  value: Range;
  onChange: (r: Range) => void;
};

/** Dropdown button to select a date range. */
export default function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn-sm" onClick={() => setOpen(!open)}>
        <MS n="date_range" size={13} />
        {current?.label ?? "Date range"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--mid)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            padding: 4,
            zIndex: 100,
            minWidth: 160,
          }}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                border: "none",
                borderRadius: 7,
                background: o.value === value ? "var(--low)" : "transparent",
                fontFamily: "Manrope, sans-serif",
                fontSize: 12.5,
                fontWeight: o.value === value ? 700 : 500,
                color: "var(--on-bg)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (o.value !== value) e.currentTarget.style.background = "var(--low)";
              }}
              onMouseLeave={(e) => {
                if (o.value !== value) e.currentTarget.style.background = "transparent";
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Returns a cutoff Date for the given range, or null for "all". */
export function getRangeCutoff(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "90d":
      return new Date(now.getTime() - 90 * 86400000);
    case "12mo":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "all":
      return null;
  }
}

export type { Range };
