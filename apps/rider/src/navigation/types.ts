export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  ProfileSetup: undefined;
};

export type SearchStackParamList = {
  Search: undefined;
  TripResults: {
    origin_city_id?: number;
    destination_city_id?: number;
    date?: string;
    seats?: number;
  };
  TripDetail: { tripId: number };
};

export type BookingsStackParamList = {
  MyBookings: undefined;
  TripDetail: { tripId: number };
};

export type MainTabParamList = {
  SearchTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};
