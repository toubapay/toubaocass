export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  ProfileSetup: undefined;
};

export type ChatParams = { bookingId: number; title?: string; subtitle?: string };

export type HomeStackParamList = {
  Home: undefined;
  TripDetail: { tripId: number };
  Chat: ChatParams;
  Wallet: undefined;
  Map: undefined;
  InstantDepartures: undefined;
};

export type BookingsStackParamList = {
  MyBookings: undefined;
  TripDetail: { tripId: number };
  Chat: ChatParams;
};

export type ServicesStackParamList = {
  Services: undefined;
  NewDelivery: undefined;
  MyDeliveries: undefined;
  DeliveryDetail: { deliveryId: number };
  Anando: undefined;
  AnandoRideDetail: { rideId: number };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ServicesTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
