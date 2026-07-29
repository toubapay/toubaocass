export type Role = 'rider' | 'driver';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export type RideType = 'standard' | 'comfort' | 'xl';

export type TripStatus = 'scheduled' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export type BookingStatus = 'confirmed' | 'cancelled';

export type PaymentMethod = 'cash' | 'wallet';

export interface DriverProfile {
  id: number;
  license_number: string | null;
  license_expiry: string | null;
  kyc_status: KycStatus;
  kyc_rejection_reason: string | null;
  rating: number;
  approved_at: string | null;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface User {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  role: Role;
  phone_verified: boolean;
  profile_complete: boolean;
  driver_profile: DriverProfile | null;
  created_at: string;
}

export interface City {
  id: number;
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Car {
  id: number;
  type: 'sedan' | 'suv' | 'van' | 'minibus';
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  plate_number: string;
  seats: number;
  photo_url: string | null;
  is_active: boolean;
}

export interface Trip {
  id: number;
  driver: {
    id: number;
    name: string | null;
    phone: string;
    rating: number;
  };
  car: Car | null;
  origin_city: City | null;
  destination_city: City | null;
  departure_latitude: number | null;
  departure_longitude: number | null;
  departure_address: string | null;
  departure_date: string;
  departure_time: string;
  fare: number;
  ride_type: RideType;
  total_seats: number;
  available_seats: number;
  status: TripStatus;
  is_instant: boolean;
  is_bookable: boolean;
  notes: string | null;
  created_at: string;
  distance_km?: number;
  route_distance_km: number | null;
  route_duration_minutes: number | null;
  bookings?: Booking[];
  bookings_count?: number;
  my_booking?: { id: number; seats_booked: number; fare_total: number; status: BookingStatus } | null;
}

export interface Booking {
  id: number;
  trip: Trip;
  rider: {
    id: number;
    name: string | null;
    phone: string;
  };
  seats_booked: number;
  fare_total: number;
  payment_method: PaymentMethod;
  status: BookingStatus;
  created_at: string;
}

export interface WalletTransaction {
  id: number;
  type: 'top_up' | 'payment' | 'earning' | 'refund' | 'refund_reversal';
  amount: number;
  booking_id: number | null;
  description: string | null;
  created_at: string;
}

export interface Wallet {
  id: number;
  balance: number;
  transactions: WalletTransaction[];
}

export interface Address {
  id: number;
  label: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  booking_id: number | null;
  dem_legui_request_id: number | null;
  body: string;
  sender_id: number;
  sender_name: string | null;
  is_mine: boolean;
  read_at: string | null;
  created_at: string;
}

export type PackageType = 'document' | 'colis_leger' | 'colis_moyen' | 'colis_volumineux';

export type DeliveryStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export interface Delivery {
  id: number;
  sender: { id: number; name: string | null; phone: string };
  driver: { id: number; name: string | null; phone: string; rating: number | null } | null;
  receiver_name: string;
  receiver_phone: string;
  receiver_address_line: string;
  receiver_latitude: number;
  receiver_longitude: number;
  pickup_address_line: string;
  pickup_latitude: number;
  pickup_longitude: number;
  current_latitude: number | null;
  current_longitude: number | null;
  current_location_updated_at: string | null;
  package_type: PackageType;
  notes: string | null;
  distance_km: number;
  fee: number;
  payment_method: PaymentMethod;
  status: DeliveryStatus;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export type AnandoRideStatus = 'open' | 'full' | 'in_progress' | 'cancelled' | 'completed';

export interface AnandoRating {
  ratee_id: number;
  score: number;
  comment: string | null;
}

export interface AnandoRide {
  id: number;
  poster: {
    id: number;
    name: string | null;
    phone: string;
    role: Role;
    anando_rating: number | null;
    anando_ratings_count: number;
  };
  origin_city: City | null;
  destination_city: City | null;
  route_distance_km: number | null;
  route_duration_minutes: number | null;
  departure_point: string | null;
  departure_latitude: number | null;
  departure_longitude: number | null;
  departure_at: string;
  started_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_location_updated_at: string | null;
  price_per_seat: number;
  total_seats: number;
  available_seats: number;
  vehicle_info: string | null;
  notes: string | null;
  status: AnandoRideStatus;
  is_joinable: boolean;
  is_mine: boolean;
  created_at: string;
  bookings?: AnandoRideBooking[];
  my_booking?: {
    id: number;
    seats_booked: number;
    price_total: number;
    payment_method: PaymentMethod;
    status: BookingStatus;
  } | null;
  my_ratings_given?: AnandoRating[];
}

export interface AnandoRideBooking {
  id: number;
  anando_ride: AnandoRide;
  user: {
    id: number;
    name: string | null;
    phone: string;
    anando_rating: number | null;
    anando_ratings_count: number;
  };
  seats_booked: number;
  price_total: number;
  payment_method: PaymentMethod;
  status: BookingStatus;
  created_at: string;
}

export type DemLeguiRequestStatus = 'pending' | 'matched' | 'cancelled' | 'expired';

export type DemLeguiTripStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface DemLeguiRequest {
  id: number;
  rider: {
    id: number;
    name: string | null;
    phone: string;
  };
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: string | null;
  destination_city: City | null;
  destination_address: string | null;
  seats_requested: number;
  fare_total: number;
  payment_method: PaymentMethod;
  status: DemLeguiRequestStatus;
  dem_legui_trip_id: number | null;
  eta_minutes?: number | null;
  created_at: string;
}

export interface DemLeguiTrip {
  id: number;
  driver: {
    id: number;
    name: string | null;
    phone: string;
    rating: number;
    current_latitude: number | null;
    current_longitude: number | null;
    last_seen_at: string | null;
  };
  car: Car | null;
  destination_city: City | null;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  status: DemLeguiTripStatus;
  started_at: string | null;
  completed_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_location_updated_at: string | null;
  created_at: string;
  requests?: DemLeguiRequest[];
}

export interface ProfileTripSummary {
  id: number;
  origin_city: string | null;
  destination_city: string | null;
  departure_date: string;
  departure_time: string;
  status: TripStatus;
}

export interface ProfileStats {
  trips_count: number;
  bookings_count: number;
  anando_rides_count: number;
  anando_clients_count: number;
  earnings_total: number;
  active_booking: ProfileTripSummary | null;
  last_trip: ProfileTripSummary | null;
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
  links?: unknown;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
