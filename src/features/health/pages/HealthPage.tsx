import { useMemo, useCallback } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS } from "@/shared/components/v8";
import { SparkLine } from "@/shared/components/charts";
import superadminApi from "@/shared/api/superadmin.api";
import type { ServiceHealth, HealthPing } from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";

const SERVICES = [
  "iam",
  "event",
  "participation",
  "payment",
  "notification",
  "management",
  "intelligence",
];

const REFETCH_MS = 30_000;

/** Groups pings by service_name for easy lookup. */
function groupByService(pings: HealthPing[]): Record<string, HealthPing[]> {
  const map: Record<string, HealthPing[]> = {};
  for (const p of pings) {
    if (!map[p.service_name]) map[p.service_name] = [];
    map[p.service_name].push(p);
  }
  return map;
}

/** Aggregates pings into daily buckets: one entry per day. */
function dailyUptime(pings: HealthPing[], days: number): { date: string; healthy: boolean }[] {
  const buckets: Record<string, { total: number; healthy: number }> = {};
  for (const p of pings) {
    const day = p.checked_at.slice(0, 10);
    if (!buckets[day]) buckets[day] = { total: 0, healthy: 0 };
    buckets[day].total++;
    if (p.status === "healthy") buckets[day].healthy++;
  }
  const result: { date: string; healthy: boolean }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const b = buckets[key];
    result.push({ date: key, healthy: b ? b.healthy / b.total > 0.9 : true });
  }
  return result;
}

/** Card for a single service - shows stored latency sparkline and dependency checks. */
function ServiceCard({
  service,
  pings,
  health,
  isLoading,
}: {
  service: string;
  pings: HealthPing[];
  health: ServiceHealth | null;
  isLoading: boolean;
}) {
  const latencies = pings.map((p) => p.latency_ms);
  const lastPing = pings[pings.length - 1];
  const healthy = health?.status === "healthy";
  const degraded = !healthy && !!health?.status;

  const dotColor = isLoading
    ? "var(--on-mut)"
    : healthy
      ? "var(--success)"
      : degraded
        ? "var(--warning)"
        : "var(--error)";
  const label = isLoading
    ? "checking..."
    : healthy
      ? "healthy"
      : degraded
        ? "degraded"
        : "unreachable";
  const sparkColor = isLoading ? "#9ca3af" : healthy ? "#16a34a" : degraded ? "#dba13d" : "#e83151";

  const totalPings = pings.length;
  const healthyPings = pings.filter((p) => p.status === "healthy").length;
  const uptimePct = totalPings > 0 ? ((healthyPings / totalPings) * 100).toFixed(1) : "--";

  return (
    <div className="health-c">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.02em",
          }}
        >
          {service}-service
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10.5,
            fontWeight: 700,
            color: dotColor,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              display: "inline-block",
            }}
          />
          {label}
        </div>
      </div>

      {latencies.length > 1 ? (
        <SparkLine data={latencies.slice(-20)} color={sparkColor} height={40} />
      ) : (
        <div style={{ height: 40, display: "grid", placeItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "var(--on-mut)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            collecting data...
          </span>
        </div>
      )}

      <div
        style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 8 }}
      >
        <span
          style={{ fontSize: 10, color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}
        >
          {lastPing ? `${lastPing.latency_ms}ms` : "--"}
        </span>
        <span
          style={{ fontSize: 10, color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}
        >
          {uptimePct}% uptime
        </span>
      </div>

      {health?.checks && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(health.checks).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
                {k}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: v === "healthy" ? "var(--success)" : "var(--error)",
                }}
              >
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
      {health?.version && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--on-mut)",
          }}
        >
          v{health.version}
        </div>
      )}
    </div>
  );
}

/** Compact card for infrastructure dependencies. */
function InfraCard({
  name,
  icon,
  pings,
  liveStatus,
  isLoading,
  extraDetails,
}: {
  name: string;
  icon: string;
  pings: HealthPing[];
  liveStatus: "healthy" | "unhealthy" | "unreachable";
  isLoading: boolean;
  extraDetails?: Record<string, string>;
}) {
  const status = isLoading ? "healthy" : liveStatus;
  const dotColor = isLoading
    ? "var(--on-mut)"
    : status === "healthy"
      ? "var(--success)"
      : status === "unhealthy"
        ? "var(--warning)"
        : "var(--error)";
  const label = isLoading ? "checking..." : status;

  const totalPings = pings.length;
  const healthyPings = pings.filter((p) => p.status === "healthy").length;
  const uptimePct = totalPings > 0 ? ((healthyPings / totalPings) * 100).toFixed(1) : "--";

  const details: Record<string, string> = {
    uptime: `${uptimePct}%`,
    pings: String(totalPings),
    ...extraDetails,
  };

  return (
    <div className="health-c">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MS n={icon} size={18} style={{ color: dotColor }} />
          <span
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10.5,
            fontWeight: 700,
            color: dotColor,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              display: "inline-block",
            }}
          />
          {label}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Object.entries(details).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
              {k}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: "var(--on-var)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** System health dashboard with 30-day stored history. */
export default function HealthPage() {
  // stored 30-day history from intelligence service
  const { data: historyPings = [] } = useQuery({
    queryKey: ["health-history"],
    queryFn: () => superadminApi.fetchHealthHistory(30),
    refetchInterval: REFETCH_MS,
  });

  // live health checks - useQueries is the correct hook for a dynamic list
  const queries = useQueries({
    queries: SERVICES.map((s) => ({
      queryKey: ["health", s],
      queryFn: () => superadminApi.fetchHealth(s),
      retry: false as const,
      refetchInterval: REFETCH_MS,
    })),
  });

  // latest health round from intelligence service - used for infra status instead of direct calls
  const { data: latestRound = [] } = useQuery({
    queryKey: ["health-latest"],
    queryFn: superadminApi.fetchLatestHealthRound,
    refetchInterval: REFETCH_MS,
  });

  // extract infra statuses from the stored intelligence ping results
  function infraStatus(name: string): "healthy" | "unhealthy" | "unreachable" {
    const ping = latestRound.find(
      (p) => p.service_name.toLowerCase() === name.toLowerCase()
    );
    if (!ping) return "unreachable";
    return ping.status === "healthy" ? "healthy" : ping.status === "unhealthy" ? "unhealthy" : "unreachable";
  }

  const infraLoading = latestRound.length === 0;

  // group history pings by service
  const byService = useMemo(() => groupByService(historyPings), [historyPings]);

  // derive redis + db status from live backend checks
  const backendHealthData = queries.map((q) => q.data).filter(Boolean);
  const redisLive = backendHealthData.some((d) => d?.checks?.redis === "healthy")
    ? "healthy"
    : "unhealthy";
  const dbHealthyCount = backendHealthData.filter((d) => d?.checks?.database === "healthy").length;

  const refreshAll = useCallback(() => {
    queries.forEach((q) => q.refetch());
  }, [queries]);

  // aggregate KPIs
  const healthyCount = queries.filter((q) => !q.isLoading && q.data?.status === "healthy").length;
  const allHealthy = healthyCount === SERVICES.length;

  // 30-day uptime from stored data
  const totalStoredPings = historyPings.length;
  const totalStoredHealthy = historyPings.filter((p) => p.status === "healthy").length;
  const storedUptimePct =
    totalStoredPings > 0 ? ((totalStoredHealthy / totalStoredPings) * 100).toFixed(2) : "--";

  // avg latency from latest round
  const latestPings = useMemo(() => {
    if (historyPings.length === 0) return [];
    const latest = historyPings[historyPings.length - 1].checked_at;
    return historyPings.filter((p) => p.checked_at === latest);
  }, [historyPings]);
  const avgLatency =
    latestPings.length > 0
      ? Math.round(latestPings.reduce((a, p) => a + p.latency_ms, 0) / latestPings.length)
      : 0;

  // daily uptime strip from all stored pings
  const uptimeStrip = useMemo(() => dailyUptime(historyPings, 30), [historyPings]);

  return (
    <AdminLayout crumbs={["Operations", "Health"]}>
      <PH
        title="System health"
        sub="Real-time status with 30-day history. Auto-refreshes every 30s, pings stored every 5 min."
        actions={
          <>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Service", "Type", "Status", "Latency", "Checked At"];
                const rows = historyPings.map((p) => [
                  p.service_name,
                  p.service_type,
                  p.status,
                  `${p.latency_ms}ms`,
                  new Date(p.checked_at).toLocaleString(),
                ]);
                exportCSV(headers, rows, "health-export");
              }}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Service", "Type", "Status", "Latency", "Checked At"];
                const rows = historyPings.map((p) => [
                  p.service_name,
                  p.service_type,
                  p.status,
                  `${p.latency_ms}ms`,
                  new Date(p.checked_at).toLocaleString(),
                ]);
                exportPDF("System Health", headers, rows, "health-export");
              }}
            >
              <MS n="print" size={13} />
              Export PDF
            </button>
            <button className="btn-sm" onClick={refreshAll}>
              <MS n="refresh" size={13} />
              Refresh
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          icon="health_and_safety"
          color={allHealthy ? "mnt" : "crl"}
          label="Overall"
          value={allHealthy ? "Healthy" : `${SERVICES.length - healthyCount} issues`}
          trend={`30d uptime: ${storedUptimePct}%`}
          trendKind={allHealthy ? "steady" : "warn"}
        />
        <KPI
          icon="check_circle"
          color="mnt"
          label="Services up"
          value={`${healthyCount} / ${SERVICES.length}`}
        />
        <KPI
          icon="speed"
          color="lav"
          label="Avg latency"
          value={avgLatency > 0 ? `${avgLatency}ms` : "--"}
          trend={totalStoredPings > 0 ? `${totalStoredPings} pings stored` : "warming up"}
          trendKind="steady"
        />
        <KPI
          icon="timer"
          color="crl"
          label="Auto-refresh"
          value="30s"
          trendKind="steady"
          trend="live + stored every 5m"
        />
      </div>

      {/* 30-day uptime strip from stored data */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--on-mut)",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>30-day uptime</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: allHealthy ? "var(--success)" : "var(--warning)",
            }}
          >
            {allHealthy
              ? "All services operational"
              : `${SERVICES.length - healthyCount} service(s) degraded`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 8, overflow: "hidden" }}>
          {uptimeStrip.map((day, i) => (
            <div
              key={i}
              title={day.date}
              style={{
                flex: 1,
                background:
                  totalStoredPings === 0 ? "var(--mid)" : day.healthy ? "#16a34a" : "#facc15",
                borderRadius: 2,
                cursor: "default",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 5,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--on-mut)",
          }}
        >
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* application service cards */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--on-mut)",
            marginBottom: 10,
          }}
        >
          Application services
        </p>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}
      >
        {SERVICES.map((s, i) => (
          <ServiceCard
            key={s}
            service={s}
            pings={byService[s] ?? []}
            health={queries[i].data ?? null}
            isLoading={queries[i].isLoading}
          />
        ))}
      </div>

      {/* infrastructure cards */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--on-mut)",
            marginBottom: 10,
          }}
        >
          Infrastructure
        </p>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}
      >
        <InfraCard
          name="PostgreSQL"
          icon="database"
          pings={[]}
          liveStatus={dbHealthyCount === SERVICES.length ? "healthy" : "unhealthy"}
          isLoading={backendHealthData.length === 0}
          extraDetails={{ databases: `${dbHealthyCount} / ${SERVICES.length} healthy` }}
        />
        <InfraCard
          name="Redis"
          icon="memory"
          pings={byService["redis"] ?? []}
          liveStatus={redisLive as "healthy" | "unhealthy"}
          isLoading={backendHealthData.length === 0}
        />
        <InfraCard
          name="RabbitMQ"
          icon="swap_horiz"
          pings={byService["rabbitmq"] ?? []}
          liveStatus={infraStatus("rabbitmq")}
          isLoading={infraLoading}
        />
        <InfraCard
          name="Elasticsearch"
          icon="search"
          pings={byService["elasticsearch"] ?? []}
          liveStatus={infraStatus("elasticsearch")}
          isLoading={infraLoading}
        />
        <InfraCard
          name="MinIO"
          icon="cloud_upload"
          pings={byService["minio"] ?? []}
          liveStatus={infraStatus("minio")}
          isLoading={infraLoading}
        />
      </div>
    </AdminLayout>
  );
}
