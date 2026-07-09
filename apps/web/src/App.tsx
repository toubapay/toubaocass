import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { ProfilePage } from './pages/ProfilePage';
import { TripDetailPage } from './pages/TripDetailPage';

function AppRoutes() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <CenteredSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
        <Routes>
          <Route path="/login" element={<PhoneEntryPage />} />
          <Route path="/verify" element={<OtpVerifyPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  if (!user?.profile_complete) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
        <ProfileSetupPage />
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
