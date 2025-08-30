import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import AgentsPage from '@/pages/AgentsPage';
import WorkflowsPage from '@/pages/WorkflowsPage';
import LogsPage from '@/pages/LogsPage';
import AlertsPage from '@/pages/AlertsPage';
import SettingsPage from '@/pages/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
