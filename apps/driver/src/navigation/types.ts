export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  ProfileSetup: undefined;
};

export type TripsStackParamList = {
  TripsList: undefined;
  PostTrip: undefined;
  TripDetail: { tripId: number };
};

export type FleetStackParamList = {
  CarsList: undefined;
  AddCar: undefined;
};

export type KycStackParamList = {
  KycStatus: undefined;
  KycForm: undefined;
};

export type MainTabParamList = {
  TripsTab: undefined;
  FleetTab: undefined;
  KycTab: undefined;
  ProfileTab: undefined;
};
