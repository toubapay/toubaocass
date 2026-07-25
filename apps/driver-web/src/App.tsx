import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { CenteredSpinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModuleStatusProvider } from './context/ModuleStatusContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { AddCarPage } from './pages/AddCarPage';
import { AnandoPage } from './pages/AnandoPage';
import { AnandoRideDetailPage } from './pages/AnandoRideDetailPage';
import { OtpVerifyPage } from './pages/auth/OtpVerifyPage';
import { PhoneEntryPage } from './pages/auth/PhoneEntryPage';
import { ProfileSetupPage } from './pages/auth/ProfileSetupPage';
import { CarsListPage } from './pages/CarsListPage';
import { ChatPage } from './pages/ChatPage';
import { DeliveriesListPage } from './pages/DeliveriesListPage';
import { DeliveryDetailPage } from './pages/DeliveryDetailPage';
import { DemLeguiRequestsPage } from './pages/DemLeguiRequestsPage';
import { DemLeguiTripDetailPage } from './pages/DemLeguiTripDetailPage';
import { InsuranceComparePage } from './pages/InsuranceComparePage';
import { KycFormPage } from './pages/KycFormPage';
import { KycStatusPage } from './pages/KycStatusPage';
import { MyPoliciesPage } from './pages/MyPoliciesPage';
import { PostInstantTripPage } from './pages/PostInstantTripPage';
import { PostTripPage } from './pages/PostTripPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { TripsListPage } from './pages/TripsListPage';
import { WalletPage } from './pages/WalletPage';

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
      <Routes>
        <Route path="/" element={<TripsListPage />} />
        <Route path="/post-trip" element={<PostTripPage />} />
        <Route path="/post-instant-trip" element={<PostInstantTripPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/anando" element={<AnandoPage />} />
        <Route path="/anando/:id" element={<AnandoRideDetailPage />} />
        <Route path="/dem-legui" element={<DemLeguiRequestsPage />} />
        <Route path="/dem-legui/trips/:id" element={<DemLeguiTripDetailPage />} />
        <Route path="/deliveries" element={<DeliveriesListPage />} />
        <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />
        <Route path="/fleet" element={<CarsListPage />} />
        <Route path="/fleet/add-car" element={<AddCarPage />} />
        <Route path="/fleet/insurance-compare" element={<InsuranceComparePage />} />
        <Route path="/fleet/my-policies" element={<MyPoliciesPage />} />
        <Route path="/kyc" element={<KycStatusPage />} />
        <Route path="/kyc/form" element={<KycFormPage />} />
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
      <ModuleStatusProvider>
        <AppRoutes />
      </ModuleStatusProvider>
    </AuthProvider>
  );
}
