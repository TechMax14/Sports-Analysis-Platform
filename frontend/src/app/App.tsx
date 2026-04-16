import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box } from "@chakra-ui/react";

import TopNavBar from "./shell/TopNavBar";
import Home from "./Home";
import NbaShell from "../features/nba/shell/NbaShell";
import NflShell from "../features/nfl/shell/NflShell";
import MlbShell from "../features/mlb/shell/MlbShell";
import NhlShell from "../features/nhl/shell/NhlShell";

export default function App() {
  return (
    <BrowserRouter>
      <TopNavBar />

      <Box pt={2}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="nba/*" element={<NbaShell />} />
          <Route path="nfl/*" element={<NflShell />} />
          <Route path="mlb/*" element={<MlbShell />} />
          <Route path="nhl/*" element={<NhlShell />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
