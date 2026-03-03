import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import RequireAuth from "@/features/auth/components/RequireAuth";
import LoginPage from "@/features/auth/pages/LoginPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrgsPage from "@/features/orgs/pages/OrgsPage";
import OrgVerifyPage from "@/features/orgs/pages/OrgVerifyPage";
import VerificationQueuePage from "@/features/verification-queue/pages/VerificationQueuePage";
import UsersPage from "@/features/users/pages/UsersPage";
import BillingPage from "@/features/billing/pages/BillingPage";
import SupportPage from "@/features/support/pages/SupportPage";
import PlatformAnalyticsPage from "@/features/platform-analytics/pages/PlatformAnalyticsPage";
import HealthPage from "@/features/health/pages/HealthPage";
import AuditLogPage from "@/features/audit-log/pages/AuditLogPage";
import DisputesPage from "@/features/disputes/pages/DisputesPage";
import AnnouncementsPage from "@/features/announcements/pages/AnnouncementsPage";
import FeatureFlagsPage from "@/features/feature-flags/pages/FeatureFlagsPage";
import ModerationPage from "@/features/moderation/pages/ModerationPage";
import CompliancePage from "@/features/compliance/pages/CompliancePage";

function P({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

/** Superadmin root router. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <P>
              <DashboardPage />
            </P>
          }
        />
        <Route
          path="/organizations"
          element={
            <P>
              <OrgsPage />
            </P>
          }
        />
        <Route
          path="/organizations/:id/verify"
          element={
            <P>
              <OrgVerifyPage />
            </P>
          }
        />
        <Route
          path="/verification-queue"
          element={
            <P>
              <VerificationQueuePage />
            </P>
          }
        />
        <Route
          path="/users"
          element={
            <P>
              <UsersPage />
            </P>
          }
        />
        <Route
          path="/billing"
          element={
            <P>
              <BillingPage />
            </P>
          }
        />
        <Route
          path="/support"
          element={
            <P>
              <SupportPage />
            </P>
          }
        />
        <Route
          path="/analytics"
          element={
            <P>
              <PlatformAnalyticsPage />
            </P>
          }
        />
        <Route
          path="/health"
          element={
            <P>
              <HealthPage />
            </P>
          }
        />
        <Route
          path="/disputes"
          element={
            <P>
              <DisputesPage />
            </P>
          }
        />
        <Route
          path="/audit-log"
          element={
            <P>
              <AuditLogPage />
            </P>
          }
        />
        <Route
          path="/announcements"
          element={
            <P>
              <AnnouncementsPage />
            </P>
          }
        />
        <Route
          path="/feature-flags"
          element={
            <P>
              <FeatureFlagsPage />
            </P>
          }
        />
        <Route
          path="/moderation"
          element={
            <P>
              <ModerationPage />
            </P>
          }
        />
        <Route
          path="/compliance"
          element={
            <P>
              <CompliancePage />
            </P>
          }
        />
        {/* catch-all 404 */}
        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Manrope, sans-serif",
                gap: 12,
              }}
            >
              <p style={{ fontSize: 48, fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>
                404
              </p>
              <p style={{ fontSize: 16, color: "var(--on-var)" }}>Page not found</p>
              <Link to="/" style={{ fontSize: 14, color: "var(--primary)" }}>
                Back to dashboard
              </Link>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
