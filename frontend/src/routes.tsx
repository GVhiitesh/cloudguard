import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { ProtectedRoute, RoleRoute } from '@/components/layout/guards';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Resources } from '@/pages/Resources';
import { ResourceTwin } from '@/pages/ResourceTwin';
import { Anomalies } from '@/pages/Anomalies';
import { Idle } from '@/pages/Idle';
import { Recommendations } from '@/pages/Recommendations';
import { Budgets } from '@/pages/Budgets';
import { Alerts } from '@/pages/Alerts';
import { UsersPage } from '@/pages/Users';
import { AuditLogs } from '@/pages/AuditLogs';
import { Settings } from '@/pages/Settings';
import { Topology } from '@/pages/Topology';
import { NotFound } from '@/pages/NotFound';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <PageShell />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/resources', element: <Resources /> },
          { path: '/resources/:id', element: <ResourceTwin /> },
          { path: '/anomalies', element: <Anomalies /> },
          { path: '/idle', element: <Idle /> },
          { path: '/topology', element: <Topology /> },
          { path: '/recommendations', element: <Recommendations /> },
          { path: '/alerts', element: <Alerts /> },
          { path: '/settings', element: <Settings /> },
          {
            element: <RoleRoute roles={['ADMIN', 'EDITOR']} />,
            children: [{ path: '/budgets', element: <Budgets /> }],
          },
          {
            element: <RoleRoute roles={['ADMIN']} />,
            children: [
              { path: '/users', element: <UsersPage /> },
              { path: '/audit', element: <AuditLogs /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
