import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SatelliteDetection from "./pages/SatelliteDetection";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import AISCorrelation from "./pages/AISCorrelation";
import DriftAnalysis from "./pages/DriftAnalysis";
import VesselRisk from "./pages/VesselRisk";
import InvestigationReports from "./pages/InvestigationReports";
import AlertCenter from "./pages/AlertCenter";
import Configuration from "./pages/Configuration";
import InvestigationHistory from "./pages/InvestigationHistory";
import App from "./App";

const PlaceholderPage = ({ title, subtitle, icon }) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Maritime Intelligence Center
        </p>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl">{icon}</span>

          <h2 className="text-3xl font-bold tracking-tight">
            {title}
          </h2>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-8">
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
            {icon}
          </div>

          <h3 className="mt-5 text-lg font-bold text-white">
            {title}
          </h3>

          <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
            This workspace is ready for the existing investigation
            functionality to be connected here.
          </p>
        </div>
      </div>
    </div>
  );
};

const DashboardRoutes = () => {
  const navigate = useNavigate();

  const handleNavigate = (page) => {
    const routes = {
      overview: "/",
      satellite: "/satellite",
      drift: "/drift",
      ais: "/ais",
      vessels: "/vessels",
      alerts: "/alerts",
      history: "/history",
      reports: "/reports",
      configuration: "/configuration",
    };

    navigate(routes[page] || "/");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DashboardLayout
            activePage="overview"
            onNavigate={handleNavigate}
          >
            <Overview onNavigate={handleNavigate} />
          </DashboardLayout>
        }
      />
<Route
  path="/satellite"
  element={
    <DashboardLayout
      activePage="satellite"
      onNavigate={handleNavigate}
    >
      <SatelliteDetection />
    </DashboardLayout>
  }
/>
<Route
  path="/drift"
  element={
    <DashboardLayout
      activePage="drift"
      onNavigate={handleNavigate}
    >
      <DriftAnalysis />
    </DashboardLayout>
  }
/>
<Route
  path="/ais"
  element={
    <DashboardLayout
      activePage="ais"
      onNavigate={handleNavigate}
    >
      <AISCorrelation />
    </DashboardLayout>
  }
/>
<Route
  path="/vessels"
  element={
    <DashboardLayout
      activePage="vessels"
      onNavigate={handleNavigate}
    >
      <VesselRisk />
    </DashboardLayout>
  }
/>
<Route
  path="/alerts"
  element={
    <DashboardLayout
      activePage="alerts"
      onNavigate={handleNavigate}
    >
      <AlertCenter />
    </DashboardLayout>
  }
/>

      
<Route
  path="/history"
  element={
    <DashboardLayout
      activePage="history"
      onNavigate={handleNavigate}
    >
      <InvestigationHistory />
    </DashboardLayout>
  }
/>
    <Route
  path="/reports"
  element={
    <DashboardLayout
      activePage="reports"
      onNavigate={handleNavigate}
    >
      <InvestigationReports />
    </DashboardLayout>
  }
/>
<Route
  path="/configuration"
  element={
    <DashboardLayout
      activePage="configuration"
      onNavigate={handleNavigate}
    >
      <Configuration />
    </DashboardLayout>
  }
/>

      {/* Original working application remains available */}
      <Route path="/legacy" element={<App />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const DashboardApp = () => {
  return (
    <BrowserRouter>
      <DashboardRoutes />
    </BrowserRouter>
  );
};

export default DashboardApp;