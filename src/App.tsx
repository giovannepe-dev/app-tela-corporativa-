import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import TrialGuard from "@/components/admin/TrialGuard";
import RoleGuard from "@/components/admin/RoleGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/admin/Dashboard";
import Devices from "./pages/admin/Devices";
import Units from "./pages/admin/Units";
import QueueManagement from "./pages/admin/QueueManagement";
import QueueDisplay from "./pages/QueueDisplay";
import Player from "./pages/Player";
import DevicePairing from "./pages/DevicePairing";
import ScreensList from "./pages/admin/ScreensList";
import Playlists from "./pages/admin/Playlists";
import ScreenEditor from "./pages/admin/ScreenEditor";
import UsersManagement from "./pages/admin/UsersManagement";
import SettingsPlaceholder from "./pages/admin/SettingsPlaceholder";
import QueueReports from "./pages/admin/QueueReports";
import MediaLibrary from "./pages/admin/MediaLibrary";
import AccessRequests from "./pages/admin/AccessRequests";
import CompaniesManagement from "./pages/admin/CompaniesManagement";
import GettingStarted from "./pages/admin/GettingStarted";
import NotFound from "./pages/NotFound";
import Offline from "./pages/Offline";
import { OfflineBanner, InstallBanner, UpdateToast } from "@/components/pwa/PWAComponents";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <TrialGuard>
      <AdminLayout>
        <RoleGuard>{children}</RoleGuard>
      </AdminLayout>
    </TrialGuard>
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBanner />
      <InstallBanner />
      <UpdateToast />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminPage><Dashboard /></AdminPage>} />
            <Route path="/admin/devices" element={<AdminPage><Devices /></AdminPage>} />
            <Route path="/admin/units" element={<AdminPage><Units /></AdminPage>} />
            <Route path="/admin/queue" element={<AdminPage><QueueManagement /></AdminPage>} />
            <Route path="/admin/screens" element={<AdminPage><ScreensList /></AdminPage>} />
            <Route path="/admin/screens/edit/:screenId" element={<ProtectedRoute><ScreenEditor /></ProtectedRoute>} />
            <Route path="/admin/playlists" element={<AdminPage><Playlists /></AdminPage>} />
            <Route path="/admin/media" element={<AdminPage><MediaLibrary /></AdminPage>} />
            <Route path="/admin/reports" element={<AdminPage><QueueReports /></AdminPage>} />
            <Route path="/admin/users" element={<AdminPage><UsersManagement /></AdminPage>} />
            <Route path="/admin/settings" element={<AdminPage><SettingsPlaceholder /></AdminPage>} />
            <Route path="/admin/companies" element={<AdminPage><CompaniesManagement /></AdminPage>} />
            <Route path="/admin/access-requests" element={<AdminPage><AccessRequests /></AdminPage>} />
            <Route path="/admin/guide" element={<AdminPage><GettingStarted /></AdminPage>} />
            <Route path="/queue-display/:unitId" element={<QueueDisplay />} />
            <Route path="/player/:deviceToken" element={<Player />} />
            <Route path="/pair" element={<DevicePairing />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
