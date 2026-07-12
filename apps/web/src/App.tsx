import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { ChatPage } from './pages/ChatPage';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { WalletPage } from './pages/WalletPage';

function AppRoutes() {
  const { isLoading, isAuthenticated, user } = useAuth();
  // Mounted once for the whole authenticated session (not inside ProfilePage
  // itself) so the foreground onMessage() listener that displays incoming
  // pushes stays active no matter which page is open when one arrives.
  const pushNotifications = usePushNotifications();

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
        <Route path="/map" element={<MapPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/chat/:bookingId" element={<ChatPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage pushNotifications={pushNotifications} />} />
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
