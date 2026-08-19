import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModuleStatusProvider } from './context/ModuleStatusContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { TripsListPage } from './pages/TripsListPage';

// Lazy-loaded: everything below is only reachable after login/navigation,
// so it doesn't need to sit in the initial bundle every visitor downloads.
const AddCarPage = lazy(() => import('./pages/AddCarPage').then((m) => ({ default: m.AddCarPage })));
const AnandoPage = lazy(() => import('./pages/AnandoPage').then((m) => ({ default: m.AnandoPage })));
const AnandoRideDetailPage = lazy(() => import('./pages/AnandoRideDetailPage').then((m) => ({ default: m.AnandoRideDetailPage })));
const CarsListPage = lazy(() => import('./pages/CarsListPage').then((m) => ({ default: m.CarsListPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const DeliveriesListPage = lazy(() => import('./pages/DeliveriesListPage').then((m) => ({ default: m.DeliveriesListPage })));
const DeliveryDetailPage = lazy(() => import('./pages/DeliveryDetailPage').then((m) => ({ default: m.DeliveryDetailPage })));
const DemLeguiChatPage = lazy(() => import('./pages/DemLeguiChatPage').then((m) => ({ default: m.DemLeguiChatPage })));
const DemLeguiRequestsPage = lazy(() => import('./pages/DemLeguiRequestsPage').then((m) => ({ default: m.DemLeguiRequestsPage })));
const DemLeguiTripDetailPage = lazy(() => import('./pages/DemLeguiTripDetailPage').then((m) => ({ default: m.DemLeguiTripDetailPage })));
const InsuranceComparePage = lazy(() => import('./pages/InsuranceComparePage').then((m) => ({ default: m.InsuranceComparePage })));
const InsurancePage = lazy(() => import('./pages/InsurancePage').then((m) => ({ default: m.InsurancePage })));
const KycFormPage = lazy(() => import('./pages/KycFormPage').then((m) => ({ default: m.KycFormPage })));
const KycStatusPage = lazy(() => import('./pages/KycStatusPage').then((m) => ({ default: m.KycStatusPage })));
const MyPoliciesPage = lazy(() => import('./pages/MyPoliciesPage').then((m) => ({ default: m.MyPoliciesPage })));
const PostInstantTripPage = lazy(() => import('./pages/PostInstantTripPage').then((m) => ({ default: m.PostInstantTripPage })));
const PostTripPage = lazy(() => import('./pages/PostTripPage').then((m) => ({ default: m.PostTripPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage').then((m) => ({ default: m.TripDetailPage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then((m) => ({ default: m.WalletPage })));

function AppRoutes() {
  const { isLoading, isAuthenticated, user } = useAuth();
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
      <Suspense fallback={<CenteredSpinner />}>
      <Routes>
        <Route path="/" element={<TripsListPage />} />
        <Route path="/post-trip" element={<PostTripPage />} />
        <Route path="/post-instant-trip" element={<PostInstantTripPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/anando" element={<AnandoPage />} />
        <Route path="/anando/:id" element={<AnandoRideDetailPage />} />
        <Route path="/dem-legui" element={<DemLeguiRequestsPage />} />
        <Route path="/dem-legui/trips/:id" element={<DemLeguiTripDetailPage />} />
        <Route path="/dem-legui/requests/:requestId/chat" element={<DemLeguiChatPage />} />
        <Route path="/deliveries" element={<DeliveriesListPage />} />
        <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />
        <Route path="/fleet" element={<CarsListPage />} />
        <Route path="/fleet/add-car" element={<AddCarPage />} />
        <Route path="/fleet/insurance-compare" element={<InsuranceComparePage />} />
        <Route path="/fleet/my-policies" element={<MyPoliciesPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/kyc" element={<KycStatusPage />} />
        <Route path="/kyc/form" element={<KycFormPage />} />
        <Route path="/chat/:bookingId" element={<ChatPage />} />
        <Route path="/wallet" element={<WalletPage />} />
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
