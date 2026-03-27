import { BrowserRouter, Routes, Route } from "react-router-dom";
import DevicePairing from "./pages/DevicePairing";
import Player from "./pages/Player";
import Offline from "./pages/Offline";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

const isTVMode = import.meta.env.VITE_TV_MODE === 'true';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TV Mode Routes */}
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
            <Route path="*" element={<Index />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
