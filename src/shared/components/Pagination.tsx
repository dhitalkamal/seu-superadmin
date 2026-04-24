import { MS } from "@/shared/components/v8";

type Props = {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
};

/** Table pagination bar with page numbers and prev/next. */
export default function Pagination({ page, totalPages, from, to, total, onPrev, onNext, onPage }: Props) {
  if (totalPages <= 1) return null;

  // show at most 5 page buttons centered around current
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderTop: "1px solid var(--outline)",
        marginTop: 8,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
        {from}-{to} of {total}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={onPrev}
          disabled={page <= 1}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--outline)",
            background: "transparent",
            cursor: page <= 1 ? "not-allowed" : "pointer",
            opacity: page <= 1 ? 0.3 : 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          <MS n="chevron_left" size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: 6,
              border: p === page ? "none" : "1px solid var(--outline)",
              background: p === page ? "#050a26" : "transparent",
              color: p === page ? "white" : "var(--on-var)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--outline)",
            background: "transparent",
            cursor: page >= totalPages ? "not-allowed" : "pointer",
            opacity: page >= totalPages ? 0.3 : 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          <MS n="chevron_right" size={16} />
        </button>
      </div>
    </div>
  );
}
