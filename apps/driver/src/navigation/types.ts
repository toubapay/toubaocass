export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  ProfileSetup: undefined;
};

export type ChatParams = { bookingId: number; title?: string; subtitle?: string };

export type TripsStackParamList = {
  TripsList: undefined;
  PostTrip: undefined;
  PostInstantTrip: undefined;
  TripDetail: { tripId: number };
  Chat: ChatParams;
  Wallet: undefined;
  Anando: { initialTab?: 'available' | 'mine' } | undefined;
  AnandoRideDetail: { rideId: number };
  DemLeguiRequests: undefined;
  DemLeguiTripDetail: { tripId: number };
  DemLeguiChat: { requestId: number };
};

export type FleetStackParamList = {
  CarsList: undefined;
  AddCar: undefined;
  InsuranceCompare: { carId: number; carLabel: string };
  MyPolicies: undefined;
};

export type DeliveriesStackParamList = {
  DeliveriesList: undefined;
  DeliveryDetail: { deliveryId: number };
};

export type KycStackParamList = {
  KycStatus: undefined;
  KycForm: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
  Insurance: undefined;
  MyPolicies: undefined;
};

export type MainTabParamList = {
  TripsTab: undefined;
  DeliveriesTab: undefined;
  FleetTab: undefined;
  KycTab: undefined;
  ProfileTab: undefined;
};
