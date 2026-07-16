import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { FinancialsPage } from './pages/financials/FinancialsPage';
import { KycQueuePage } from './pages/kyc/KycQueuePage';
import { KycReviewPage } from './pages/kyc/KycReviewPage';
import { LoginPage } from './pages/LoginPage';
import { FaresPage } from './pages/settings/FaresPage';
import { SystemSettingsPage } from './pages/settings/SystemSettingsPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { UsersListPage } from './pages/users/UsersListPage';

function AppRoutes() {
  const { isLoading, isAuthenticated } = useAdminAuth();

  if (isLoading) {
    return <CenteredSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/users" replace />} />
        <Route path="/users" element={<UsersListPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/kyc" element={<KycQueuePage />} />
        <Route path="/kyc/:id" element={<KycReviewPage />} />
        <Route path="/fares" element={<FaresPage />} />
        <Route path="/financials" element={<FinancialsPage />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AppRoutes />
    </AdminAuthProvider>
  );
}
