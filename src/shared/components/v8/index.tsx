import type { CSSProperties, ReactNode } from "react";
import { useState, useEffect } from "react";

type MSProps = { n: string; size?: number; style?: CSSProperties; className?: string };
/** Material Symbol icon -matches v8 MS component exactly. */
export function MS({ n, size = 18, style = {}, className = "" }: MSProps) {
  return (
    <span className={`ms ${className}`} style={{ fontSize: size, ...style }}>
      {n}
    </span>
  );
}

type PHProps = {
  crumbs?: string[];
  title: string;
  sub?: string;
  actions?: ReactNode;
};
/** Page header with title, subtitle, and action buttons. Breadcrumb is rendered by AdminLayout. */
export function PH({ crumbs: _crumbs, title, sub, actions }: PHProps) {
  return (
    <div className="ph">
      <div>
        <h1 className="app-title">{title}</h1>
        {sub && <p className="app-sub">{sub}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

type KPIProps = {
  icon: string;
  color?: string;
  label: string;
  value: string;
  trend?: string;
  trendKind?: "up" | "down" | "warn" | "steady";
};
/** KPI tile -matches v8 KPI component exactly. */
export function KPI({ icon, color = "lav", label, value, trend, trendKind = "up" }: KPIProps) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <div className={`kpi-icon ${color}`}>
          <MS n={icon} size={18} />
        </div>
        {trend && <span className={`kpi-trend ${trendKind}`}>{trend}</span>}
      </div>
      <div className="kpi-lab">{label}</div>
      <div className="kpi-val">{value}</div>
    </div>
  );
}

type ToastProps = { msg: string; onDone: () => void };
/** Auto-dismissing toast notification. */
export function Toast({ msg, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast">
      <MS n="check_circle" size={18} />
      {msg}
    </div>
  );
}

/** Hook for toast state management. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const toast = (m: string) => setMsg(m);
  const toastEl = msg ? <Toast msg={msg} onDone={() => setMsg(null)} /> : null;
  return { toast, toastEl };
}
