import type { NavigatorScreenParams } from '@react-navigation/native';

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
  Anando: { initialTab?: 'available' | 'mine' } | undefined;
  AnandoRideDetail: { rideId: number };
  NewDemLeguiRequest: undefined;
  DemLeguiRequestDetail: { requestId: number };
  DemLeguiChat: { requestId: number };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  ServicesTab: NavigatorScreenParams<ServicesStackParamList> | undefined;
  BookingsTab: NavigatorScreenParams<BookingsStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
