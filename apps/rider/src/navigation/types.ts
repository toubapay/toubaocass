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
};

export type BookingsStackParamList = {
  MyBookings: undefined;
  TripDetail: { tripId: number };
  Chat: ChatParams;
};

export type MapStackParamList = {
  Map: undefined;
  TripDetail: { tripId: number };
  Chat: ChatParams;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
