import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NbaShell from "./pages/NbaShell";
import NflShell from "./pages/NflShell";
import MlbShell from "./pages/MlbShell";
import NhlShell from "./pages/NhlShell";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="nba/*" element={<NbaShell />} />
        <Route path="nfl/*" element={<NflShell />} />
        <Route path="mlb/*" element={<MlbShell />} />
        <Route path="nhl/*" element={<NhlShell />} />
      </Routes>
    </BrowserRouter>
  );
}
