import { BrowserRouter, Routes, Route } from "react-router-dom";
import DevicePairing from "./pages/DevicePairing";
import Player from "./pages/Player";
import Offline from "./pages/Offline";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevicePairing />} />
        <Route path="/pair" element={<DevicePairing />} />
        <Route path="/player/:deviceToken" element={<Player />} />
        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<DevicePairing />} />
      </Routes>
    </BrowserRouter>
  );
}
