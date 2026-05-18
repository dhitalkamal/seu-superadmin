import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS } from "@/shared/components/v8";
import { SparkLine } from "@/shared/components/charts";
import superadminApi from "@/shared/api/superadmin.api";

const SERVICES = [
  "iam",
  "event",
  "participation",
  "payment",
  "notification",
  "management",
  "intelligence",
];
const SPARKS: Record<string, number[]> = {
  iam: [35, 38, 32, 40, 36, 34, 38, 32, 36, 34],
  event: [42, 40, 38, 42, 44, 40, 41, 40, 42, 41],
  participation: [20, 22, 21, 24, 22, 20, 21, 22, 23, 22],
  payment: [15, 18, 14, 15, 16, 15, 14, 15, 16, 15],
  notification: [40, 42, 48, 55, 62, 68, 72, 75, 78, 78],
  management: [55, 60, 58, 62, 56, 58, 60, 58, 55, 58],
  intelligence: [27, 28, 29, 28, 26, 28, 29, 27, 28, 28],
};

function ServiceCard({ service }: { service: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["health", service],
    queryFn: () => superadminApi.fetchHealth(service),
    retry: false,
    refetchInterval: 30_000,
  });

  // data present even on 503 means service is running but a dependency check failed
  const healthy = data?.status === "healthy";
  const degraded = !healthy && !!data?.status;
  const spark = SPARKS[service] ?? [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];

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
      <SparkLine
        data={spark}
        color={isLoading ? "#9ca3af" : healthy ? "#16a34a" : degraded ? "#dba13d" : "#e83151"}
        height={40}
      />
      {data?.checks && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(data.checks).map(([k, v]) => (
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
      {data?.version && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--on-mut)",
          }}
        >
          v{data.version}
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  const results = SERVICES.map((s) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQuery({
      queryKey: ["health", s],
      queryFn: () => superadminApi.fetchHealth(s),
      retry: false,
      refetchInterval: 30_000,
    });
  });
  const allHealthy = results.every((r) => !r.isLoading && r.data?.status === "healthy");
  const unhealthyCount = results.filter(
    (r) => (r.isError && !r.data) || r.data?.status === "unhealthy"
  ).length;

  return (
    <AdminLayout>
      <PH
        crumbs={["Operations", "Health"]}
        title="System health"
        sub="Real-time status of all 7 platform microservices. Auto-refreshes every 30s."
        actions={
          <>
            <button className="btn-sm">
              <MS n="bug_report" size={13} />
              Incidents
            </button>
            <button className="btn-sm" onClick={() => results.forEach((r) => r.refetch())}>
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
          value={allHealthy ? "Healthy" : `${unhealthyCount} issues`}
          trend="30d SLA: 99.95%"
          trendKind={allHealthy ? "steady" : "warn"}
        />
        <KPI
          icon="check_circle"
          color="mnt"
          label="Services up"
          value={`${results.filter((r) => r.data?.status === "healthy").length} / ${SERVICES.length}`}
        />
        <KPI
          icon="error"
          color="crl"
          label="Unreachable"
          value={results.filter((r) => r.isError).length.toString()}
          trendKind={results.some((r) => r.isError) ? "warn" : "steady"}
        />
        <KPI
          icon="speed"
          color="lav"
          label="Auto-refresh"
          value="30s"
          trendKind="steady"
          trend="live monitoring"
        />
      </div>

      {/* 30-day uptime bar */}
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
          <span>30-day uptime strip</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: allHealthy ? "var(--success)" : "var(--warning)",
            }}
          >
            {allHealthy ? "All services operational" : `${unhealthyCount} service(s) degraded`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 8, overflow: "hidden" }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{ flex: 1, background: i === 12 ? "#facc15" : "#16a34a", borderRadius: 2 }}
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

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}
      >
        {SERVICES.map((s) => (
          <ServiceCard key={s} service={s} />
        ))}
      </div>
    </AdminLayout>
  );
}
