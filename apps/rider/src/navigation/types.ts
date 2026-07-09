export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  ProfileSetup: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  TripDetail: { tripId: number };
};

export type BookingsStackParamList = {
  MyBookings: undefined;
  TripDetail: { tripId: number };
};

export type MapStackParamList = {
  Map: undefined;
  TripDetail: { tripId: number };
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
