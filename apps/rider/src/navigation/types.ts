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

export type MainTabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
