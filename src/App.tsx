import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrgsPage from "@/features/orgs/pages/OrgsPage";
import UsersPage from "@/features/users/pages/UsersPage";
import AnnouncementsPage from "@/features/announcements/pages/AnnouncementsPage";
import BillingPage from "@/features/billing/pages/BillingPage";
import CompliancePage from "@/features/compliance/pages/CompliancePage";
import FeatureFlagsPage from "@/features/feature-flags/pages/FeatureFlagsPage";
import HealthPage from "@/features/health/pages/HealthPage";
import ModerationPage from "@/features/moderation/pages/ModerationPage";
import SupportPage from "@/features/support/pages/SupportPage";

/** Superadmin root router. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/organisations" element={<OrgsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/feature-flags" element={<FeatureFlagsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
