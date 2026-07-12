export type Role = 'rider' | 'driver';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export type RideType = 'standard' | 'comfort' | 'xl';

export type TripStatus = 'scheduled' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export type BookingStatus = 'confirmed' | 'cancelled';

export type CarType = 'sedan' | 'suv' | 'van' | 'minibus';

export interface DriverProfile {
  id: number;
  license_number: string | null;
  license_expiry: string | null;
  kyc_status: KycStatus;
  kyc_rejection_reason: string | null;
  rating: number;
  approved_at: string | null;
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
}

export interface Car {
  id: number;
  type: CarType;
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
  notes: string | null;
  created_at: string;
  bookings?: Booking[];
  bookings_count?: number;
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
  status: BookingStatus;
  created_at: string;
}

export interface Message {
  id: number;
  booking_id: number;
  body: string;
  sender_id: number;
  sender_name: string | null;
  is_mine: boolean;
  read_at: string | null;
  created_at: string;
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
