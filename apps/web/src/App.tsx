import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.js';
import { DashboardPage } from './pages/DashboardPage/index.js';
import { RoomsPage } from './pages/RoomsPage/index.js';
import { RoomAnalyticsPage } from './pages/RoomAnalyticsPage/index.js';
import { RoomDeviceWallPage } from './pages/RoomDeviceWallPage/index.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:roomId" element={<RoomAnalyticsPage />} />
          <Route path="/rooms/:roomId/virtual" element={<RoomDeviceWallPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
