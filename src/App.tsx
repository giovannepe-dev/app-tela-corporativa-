import { BrowserRouter, Routes, Route } from "react-router-dom";
import DevicePairing from "./pages/DevicePairing";
import Player from "./pages/Player";
import Offline from "./pages/Offline";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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

const isTVMode = import.meta.env.VITE_TV_MODE === 'true';

console.log('🎬 App loaded - isTVMode:', isTVMode, 'VITE_TV_MODE:', import.meta.env.VITE_TV_MODE);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TV Mode Routes */}
        {isTVMode && (
          <>
            {console.log('📺 TV Mode Routes Active')}
          </>
        )}
        {isTVMode && (
          <>
            <Route path="/" element={<DevicePairing />} />
            <Route path="/pair" element={<DevicePairing />} />
            <Route path="/player/:deviceToken" element={<Player />} />
            <Route path="*" element={<DevicePairing />} />
          </>
        )}

        {/* Admin Web Routes */}
        {!isTVMode && (
          <>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pair" element={<DevicePairing />} />
            <Route path="/player/:deviceToken" element={<Player />} />
            <Route path="/offline" element={<Offline />} />

            {/* Admin Panel Routes */}
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

            <Route path="*" element={<Index />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
