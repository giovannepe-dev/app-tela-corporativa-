import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import DevicePairing from "./pages/DevicePairing";
import Player from "./pages/Player";
import Offline from "./pages/Offline";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TvWebView from "./pages/TvWebView";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Devices from "./pages/admin/Devices";
import ScreensList from "./pages/admin/ScreensList";
import ScreenEditor from "./pages/admin/ScreenEditor";
import Playlists from "./pages/admin/Playlists";
import MediaLibrary from "./pages/admin/MediaLibrary";
import Units from "./pages/admin/Units";
import QueueManagement from "./pages/admin/QueueManagement";
import QueueReports from "./pages/admin/QueueReports";
import UsersManagement from "./pages/admin/UsersManagement";
import CompaniesManagement from "./pages/admin/CompaniesManagement";
import GettingStarted from "./pages/admin/GettingStarted";
import AccessRequests from "./pages/admin/AccessRequests";

export default function App() {
  const { user, loading } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);

  // Detect current path for TV mode
  useEffect(() => {
    const path = window.location.pathname;
    setPathname(path);

    // Force TV mode if no path or loading auth fails
    const isMobileApp = window.matchMedia("(display-mode: standalone)").matches ||
                        (window.navigator as any).standalone === true ||
                        (window as any).capacitor !== undefined;

    if (isMobileApp && path !== "/pair" && path !== "/player" && path !== "/offline") {
      console.log("📱 Mobile app detected, forcing /pair route");
      window.location.href = "/pair";
    }
  }, []);

  // TV mode: explicitly on /pair route OR /player/* routes
  // Admin mode: authenticated AND not on TV routes
  const isTVRoute = pathname === "/pair" || pathname.startsWith("/player") || pathname === "/offline";
  const isAuthenticated = !!user && !loading && !isTVRoute;

  console.log("🔧 App render - loading:", loading, "isTVRoute:", isTVRoute, "isAuthenticated:", isAuthenticated, "pathname:", pathname);

  if (loading && !isTVRoute) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: 'white', fontSize: '20px' }}>Carregando... (loading={String(loading)})</div>;
  }

  return (
    <>
      {/* Debug Banner - Shows Auth Status */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: isAuthenticated ? '#ef4444' : '#22c55e',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        zIndex: 9999,
        textAlign: 'center'
      }}>
        {isAuthenticated ? '❌ ADMIN MODE (User: ' + user?.email + ')' : '✅ TV MODE READY'}
      </div>

      <BrowserRouter>
        <Routes>
        {/* TV WebView - Direct Lovable app */}
        <Route path="/tv" element={<TvWebView />} />

        {/* Default route - go to pair for TV devices */}
        <Route path="/" element={<DevicePairing />} />

        {/* TV Pairing Routes - for TV devices only */}
        <Route path="/pair" element={<DevicePairing />} />
        <Route path="/player/:deviceToken" element={<Player />} />
        <Route path="/offline" element={<Offline />} />

        {/* Auth Routes - Always available */}
        <Route path="/auth" element={<Auth />} />

        {/* Admin Routes - Only for authenticated users */}
        {isAuthenticated && (
          <>
            <Route path="/admin-home" element={<Index />} />
            <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/devices" element={<AdminLayout><Devices /></AdminLayout>} />
            <Route path="/admin/screens" element={<AdminLayout><ScreensList /></AdminLayout>} />
            <Route path="/admin/screens/edit/:id" element={<AdminLayout><ScreenEditor /></AdminLayout>} />
            <Route path="/admin/playlists" element={<AdminLayout><Playlists /></AdminLayout>} />
            <Route path="/admin/media" element={<AdminLayout><MediaLibrary /></AdminLayout>} />
            <Route path="/admin/units" element={<AdminLayout><Units /></AdminLayout>} />
            <Route path="/admin/queue" element={<AdminLayout><QueueManagement /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><QueueReports /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersManagement /></AdminLayout>} />
            <Route path="/admin/companies" element={<AdminLayout><CompaniesManagement /></AdminLayout>} />
            <Route path="/admin/guide" element={<AdminLayout><GettingStarted /></AdminLayout>} />
            <Route path="/admin/access-requests" element={<AdminLayout><AccessRequests /></AdminLayout>} />
          </>
        )}

        {/* Fallback routes - redirect to login if not authenticated */}
        {!isAuthenticated && (
          <>
            <Route path="/" element={<Auth />} />
            <Route path="*" element={<Auth />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
    </>
  );
}
