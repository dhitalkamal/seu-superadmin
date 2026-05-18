import { useId } from "react";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

type AreaChartProps = { data: number[]; color?: string; accent?: string; height?: number };
/** Line + gradient area chart with month labels. Matches v8 AreaChart exactly. */
export function AreaChart({
  data,
  color = "#121d3f",
  accent = "#e83151",
  height = 240,
}: AreaChartProps) {
  const gid = useId();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const W = 600;
  const H = 200;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 30) - 15;
    return [x, y] as [number, number];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const fill = `${path} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="0"
          y1={(H / 4) * i + 10}
          x2={W}
          y2={(H / 4) * i + 10}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="0.5"
        />
      ))}
      <path d={fill} fill={`url(#${gid})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} opacity="0.4" />
      ))}
      <circle cx={last[0]} cy={last[1]} r="5" fill={accent} />
      {MONTHS.map((m, i) => (
        <text
          key={i}
          x={(i / 11) * W}
          y={H + 16}
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          fill="rgba(0,0,0,0.4)"
          textAnchor="middle"
        >
          {m}
        </text>
      ))}
    </svg>
  );
}

type SparkLineProps = { data: number[]; color?: string; height?: number };
/** Tiny sparkline for inline trend indicators. */
export function SparkLine({ data, color = "#121d3f", height = 32 }: SparkLineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / (max - min || 1)) * 90 - 5;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type DonutSegment = { pct: number; color: string };
type DonutChartProps = { segments: DonutSegment[]; size?: number; label?: string; sub?: string };
/** Donut chart with optional center label. */
export function DonutChart({ segments, size = 180, label, sub }: DonutChartProps) {
  let off = 0;
  const C = 2 * Math.PI * 60;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="60" fill="none" stroke="var(--mid)" strokeWidth="22" />
        {segments.map((s, i) => {
          const len = (s.pct / 100) * C;
          const dasharray = `${len} ${C - len}`;
          const dashoffset = -(off * C) / 100;
          off += s.pct;
          return (
            <circle
              key={i}
              cx="90"
              cy="90"
              r="60"
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 90 90)"
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "-0.035em",
              }}
            >
              {label}
            </div>
            {sub && (
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--on-mut)",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.06em",
                  marginTop: 2,
                  textTransform: "uppercase",
                }}
              >
                {sub}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type FunnelStage = { l: string; v: number; c?: string; c2?: string };
type FunnelProps = { stages: FunnelStage[] };
/** Horizontal funnel with drop-off percentages. */
export function Funnel({ stages }: FunnelProps) {
  const base = stages[0]?.v ?? 0;
  return (
    <div className="fnl">
      {stages.map((s, i) => {
        const w = base > 0 ? (s.v / base) * 100 : 0;
        const nextStage = stages[i + 1];
        const dropPct = nextStage && s.v > 0 ? ((1 - nextStage.v / s.v) * 100).toFixed(1) : null;
        return (
          <div key={i}>
            <div className="fnl-row">
              <div className="fnl-l">{s.l}</div>
              <div className="fnl-bar">
                <div
                  className="fnl-fill"
                  style={{
                    width: `${Math.max(w, 2)}%`,
                    background: `linear-gradient(135deg,${s.c || "#121d3f"},${s.c2 || s.c || "#3b3a72"})`,
                  }}
                >
                  {s.v.toLocaleString()}
                </div>
              </div>
              <div className="fnl-pct">{w.toFixed(1)}%</div>
            </div>
            {i < stages.length - 1 && dropPct !== null && (
              <div className="fnl-drop">
                {"↓"} {dropPct}% drop
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type BarDatum = { l: string; v: number; c?: string };
type BarsProps = { data: BarDatum[]; color?: string; height?: number };
/** Vertical bar chart with labels. */
export function Bars({ data, color = "#121d3f", height = 130 }: BarsProps) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="barsc" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="barsc-col">
          <div
            className="barsc-bar"
            style={{ height: `${(d.v / max) * 100}%`, background: d.c || color }}
            title={`${d.l}: ${d.v}`}
          />
          <span className="barsc-l">{d.l}</span>
        </div>
      ))}
    </div>
  );
}

type WaterfallItem = { l: string; v: number; kind: "tot" | "add" | "sub" };
type WaterfallProps = { items: WaterfallItem[] };
/** Waterfall chart for financial movement. */
export function Waterfall({ items }: WaterfallProps) {
  let running = 0;
  const computed = items.map((it) => {
    if (it.kind === "tot") {
      const r = { top: it.v, bot: 0, ...it };
      running = it.v;
      return r;
    }
    if (it.kind === "add") {
      const r = { top: running + it.v, bot: running, ...it };
      running += it.v;
      return r;
    }
    const r = { top: running, bot: running - it.v, ...it };
    running -= it.v;
    return r;
  });
  const maxVal = Math.max(...computed.map((c) => c.top)) * 1.08;
  return (
    <div className="wf">
      {computed.map((c, i) => {
        const topPct = (c.top / maxVal) * 100;
        const botPct = (c.bot / maxVal) * 100;
        const h = topPct - botPct;
        return (
          <div key={i} className="wf-col">
            <div
              className={`wf-bar ${c.kind}`}
              style={{ position: "absolute", bottom: `${botPct}%`, height: `${h}%`, width: "62%" }}
            >
              <div
                className="wf-v"
                style={{
                  color:
                    c.kind === "sub" ? "#b32a1f" : c.kind === "add" ? "#166534" : "var(--on-bg)",
                }}
              >
                {c.kind === "add" ? "+" : c.kind === "sub" ? "−" : ""}$
                {Math.abs(c.v).toLocaleString()}
              </div>
            </div>
            <div className="wf-l">{c.l}</div>
          </div>
        );
      })}
    </div>
  );
}

type HeatmapProps = { rows: string[]; cols: string[]; data: number[][] };
/** Retention / utilization heatmap. */
export function Heatmap({ rows, cols, data }: HeatmapProps) {
  const max = Math.max(...data.flat());
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `60px repeat(${cols.length},1fr)`,
          gap: 2,
          marginBottom: 6,
        }}
      >
        <div />
        {cols.map((c, i) => (
          <div
            key={i}
            style={{
              fontSize: 9.5,
              color: "var(--on-mut)",
              fontFamily: "JetBrains Mono, monospace",
              textAlign: "center",
              padding: "2px 0",
            }}
          >
            {c}
          </div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${cols.length},1fr)`,
            gap: 2,
            marginBottom: 2,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: "var(--on-var)",
              fontFamily: "JetBrains Mono, monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 6,
            }}
          >
            {r}
          </div>
          {data[ri].map((v, ci) => {
            const o = v / max;
            return (
              <div
                key={ci}
                className="hm-cell"
                data-v={`${v}%`}
                style={{
                  background: v ? `rgba(18,29,63,${0.08 + o * 0.8})` : "var(--low)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: o > 0.5 ? "white" : "var(--on-mut)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {v || ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
