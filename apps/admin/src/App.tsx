import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { LoginPage } from './pages/LoginPage';
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
