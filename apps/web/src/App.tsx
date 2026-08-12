import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModuleStatusProvider } from './context/ModuleStatusContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { AnandoPage } from './pages/AnandoPage';
import { AnandoRideDetailPage } from './pages/AnandoRideDetailPage';
import { ChatPage } from './pages/ChatPage';
import { DemLeguiChatPage } from './pages/DemLeguiChatPage';
import { DemLeguiRequestDetailPage } from './pages/DemLeguiRequestDetailPage';
import { DeliveryDetailPage } from './pages/DeliveryDetailPage';
import { HomePage } from './pages/HomePage';
import { InstantDeparturesPage } from './pages/InstantDeparturesPage';
import { InsurancePage } from './pages/InsurancePage';
import { MapPage } from './pages/MapPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyDeliveriesPage } from './pages/MyDeliveriesPage';
import { MyInsurancePoliciesPage } from './pages/MyInsurancePoliciesPage';
import { MyRideBookingsPage } from './pages/MyRideBookingsPage';
import { NewDeliveryPage } from './pages/NewDeliveryPage';
import { NewDemLeguiRequestPage } from './pages/NewDemLeguiRequestPage';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicTrackingPage } from './pages/PublicTrackingPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { WalletPage } from './pages/WalletPage';

function AppRoutes() {
  const { isLoading, isAuthenticated, user } = useAuth();
  // Mounted once for the whole authenticated session (not inside ProfilePage
  // itself) so the foreground onMessage() listener that displays incoming
  // pushes stays active no matter which page is open when one arrives.
  const pushNotifications = usePushNotifications();
  const location = useLocation();

  // The SOS "share my live position" link is opened by family members over
  // WhatsApp/SMS who very likely have no account at all — it must bypass
  // login entirely, unlike every other route in this app.
  if (location.pathname.startsWith('/track/')) {
    return (
      <Routes>
        <Route path="/track/:type/:id" element={<PublicTrackingPage />} />
      </Routes>
    );
  }

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
        <Route path="/instant" element={<InstantDeparturesPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/livraison" element={<NewDeliveryPage />} />
        <Route path="/services/anando" element={<AnandoPage />} />
        <Route path="/services/anando/:id" element={<AnandoRideDetailPage />} />
        <Route path="/services/dem-legui" element={<NewDemLeguiRequestPage />} />
        <Route path="/services/dem-legui/:id" element={<DemLeguiRequestDetailPage />} />
        <Route path="/services/dem-legui/:requestId/chat" element={<DemLeguiChatPage />} />
        <Route path="/deliveries" element={<MyDeliveriesPage />} />
        <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
        <Route path="/deliveries/:id/edit" element={<NewDeliveryPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/ride-bookings" element={<MyRideBookingsPage />} />
        <Route path="/chat/:bookingId" element={<ChatPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/insurance/my-policies" element={<MyInsurancePoliciesPage />} />
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
      <ModuleStatusProvider>
        <AppRoutes />
      </ModuleStatusProvider>
    </AuthProvider>
  );
}
