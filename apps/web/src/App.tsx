import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModuleStatusProvider } from './context/ModuleStatusContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { HomePage } from './pages/HomePage';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';

// Lazy-loaded: everything below is only reachable after login/navigation,
// so it doesn't need to sit in the initial bundle every visitor downloads.
const AnandoPage = lazy(() => import('./pages/AnandoPage').then((m) => ({ default: m.AnandoPage })));
const AnandoRideDetailPage = lazy(() => import('./pages/AnandoRideDetailPage').then((m) => ({ default: m.AnandoRideDetailPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const DemLeguiChatPage = lazy(() => import('./pages/DemLeguiChatPage').then((m) => ({ default: m.DemLeguiChatPage })));
const DemLeguiRequestDetailPage = lazy(() => import('./pages/DemLeguiRequestDetailPage').then((m) => ({ default: m.DemLeguiRequestDetailPage })));
const DeliveryDetailPage = lazy(() => import('./pages/DeliveryDetailPage').then((m) => ({ default: m.DeliveryDetailPage })));
const InstantDeparturesPage = lazy(() => import('./pages/InstantDeparturesPage').then((m) => ({ default: m.InstantDeparturesPage })));
const InsurancePage = lazy(() => import('./pages/InsurancePage').then((m) => ({ default: m.InsurancePage })));
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })));
const MyDeliveriesPage = lazy(() => import('./pages/MyDeliveriesPage').then((m) => ({ default: m.MyDeliveriesPage })));
const MyInsurancePoliciesPage = lazy(() => import('./pages/MyInsurancePoliciesPage').then((m) => ({ default: m.MyInsurancePoliciesPage })));
const MyRideBookingsPage = lazy(() => import('./pages/MyRideBookingsPage').then((m) => ({ default: m.MyRideBookingsPage })));
const NewDeliveryPage = lazy(() => import('./pages/NewDeliveryPage').then((m) => ({ default: m.NewDeliveryPage })));
const NewDemLeguiRequestPage = lazy(() => import('./pages/NewDemLeguiRequestPage').then((m) => ({ default: m.NewDemLeguiRequestPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage').then((m) => ({ default: m.PublicTrackingPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage').then((m) => ({ default: m.TripDetailPage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then((m) => ({ default: m.WalletPage })));

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
      <Suspense fallback={<CenteredSpinner />}>
        <Routes>
          <Route path="/track/:type/:id" element={<PublicTrackingPage />} />
        </Routes>
      </Suspense>
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
      <Suspense fallback={<CenteredSpinner />}>
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
      </Suspense>
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
