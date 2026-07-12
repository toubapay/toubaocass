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

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
