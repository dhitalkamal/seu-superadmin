import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { AreaChart, Bars } from "@/shared/components/charts";

const usersGrowth = [1840, 1960, 2020, 2098, 2156, 2210, 2268, 2310, 2342, 2380, 2402, 2412];
const eventsCreated = [12, 18, 22, 28, 34, 42, 48, 56, 62, 68, 74, 86];
const MO = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Platform analytics - v8 faithful port with growth charts, engagement, and top events. */
export default function PlatformAnalyticsPage() {
  const { toastEl } = useToast();

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Operations", "Analytics"]}
        title="Platform analytics"
        sub="Growth, engagement, retention, virality."
        actions={
          <>
            <button className="btn-sm">
              <MS n="date_range" size={13} />
              Last 12 months
            </button>
            <button className="btn-sm">
              <MS n="download" size={13} />
              Export
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI icon="domain" color="nav" label="New orgs (30d)" value="3" trend="+50%" />
        <KPI icon="group" color="lav" label="New users (30d)" value="184" trend="+22%" />
        <KPI
          icon="trending_down"
          color="pch"
          label="Monthly churn"
          value="2.1%"
          trend="-0.4 pp"
          trendKind="up"
        />
        <KPI icon="event" color="mnt" label="Events created" value="86" trend="+14" />
      </div>

      <div className="chart-grid-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Total users · 12 months</span>
            <span
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.025em",
              }}
            >
              2,412
            </span>
          </div>
          <div className="panel-body">
            <AreaChart data={usersGrowth} height={220} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Events created · monthly</span>
          </div>
          <div
            className="panel-body"
            style={{ height: 264, display: "flex", alignItems: "center", padding: "18px 22px" }}
          >
            <Bars
              data={eventsCreated.map((v, i) => ({
                l: MO[i],
                v,
                c: i === eventsCreated.length - 1 ? "#e83151" : "#121d3f",
              }))}
              height={220}
            />
          </div>
        </div>
      </div>

      <div className="chart-grid-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Engagement · weekly active orgs</span>
          </div>
          <div className="panel-body">
            {[
              ["Daily active", 38, "79%"],
              ["Weekly active", 45, "94%"],
              ["Monthly active", 47, "98%"],
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 0",
                  borderBottom: i < 2 ? "1px solid var(--outline)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r[0]}</span>
                  <span
                    style={{
                      fontFamily: "Space Grotesk",
                      fontWeight: 700,
                      fontSize: 16,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {r[1]}{" "}
                    <span style={{ fontSize: 11, color: "var(--on-mut)", fontWeight: 500 }}>
                      {r[2]}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--mid)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: r[2],
                      background: "linear-gradient(90deg,#050a26,#3b3a72)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Top events by attendance</span>
          </div>
          <div className="panel-body flush">
            <table className="tbl">
              <tbody>
                {[
                  { n: "Quantum Computing Summit", o: "Albright", v: 1240 },
                  { n: "Sustainability Ethics Gala", o: "Albright", v: 890 },
                  { n: "Civic Forum Annual", o: "Berlin", v: 684 },
                  { n: "Donor Symposium", o: "Northfield", v: 312 },
                  { n: "Urban Design Workshop", o: "Hexford", v: 45 },
                ].map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{e.n}</td>
                    <td style={{ fontSize: 11, color: "var(--on-mut)" }}>{e.o}</td>
                    <td
                      style={{
                        fontFamily: "Space Grotesk",
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: "-0.02em",
                        textAlign: "right",
                      }}
                    >
                      {e.v.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
