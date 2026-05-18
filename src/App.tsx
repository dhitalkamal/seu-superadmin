import { BrowserRouter, Route, Routes } from "react-router-dom";
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
          path="/organisations"
          element={
            <P>
              <OrgsPage />
            </P>
          }
        />
        <Route
          path="/organisations/:id/verify"
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
      </Routes>
    </BrowserRouter>
  );
}
