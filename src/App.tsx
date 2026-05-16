import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";

/** Superadmin root router -- add routes as pages are implemented. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
