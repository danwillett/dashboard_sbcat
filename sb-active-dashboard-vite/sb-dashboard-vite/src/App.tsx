import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LayerProvider from "@/lib/context/MapContext";

import HomePage from "./pages/home";
import ExplorePage from "./pages/dashboard/explore";
import SafetyPage from "./pages/dashboard/safety";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { appTheme } from "@/ui/theme"; // Adjust path if needed

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Routes outside the map context */}
          <Route path="/" element={<HomePage />} />

          {/* Routes using the map context */}
          <Route
            path="/dashboard/*"
            element={
              <LayerProvider>
                <Routes>
                  <Route path="explore" element={<ExplorePage />} />
                  <Route path="safety" element={<SafetyPage />} />
                  {/* Add additional dashboard routes here */}
                </Routes>
              </LayerProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
