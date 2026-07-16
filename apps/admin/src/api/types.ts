export type AdminRole = 'super_admin' | 'admin' | 'controllers' | 'support' | 'accountant' | 'superviseur';

export type AdminStatus = 'active' | 'suspended';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: string[];
  last_login_at: string | null;
  created_at: string;
}

export type UserRole = 'rider' | 'driver';

export type UserStatus = 'active' | 'suspended';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface UserSummary {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  kyc_status: KycStatus | null;
  created_at: string;
}

export interface DriverProfileSummary {
  id: number | null;
  license_number: string | null;
  license_expiry: string | null;
  kyc_status: KycStatus;
  kyc_rejection_reason: string | null;
  rating: number;
  approved_at: string | null;
}

export interface UserDetail {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  phone_verified: boolean;
  created_at: string;
  driver_profile?: DriverProfileSummary;
  cars_count?: number;
  trips_count?: number;
  bookings_count?: number;
  wallet_balance?: number;
}

export type KycDocumentField = 'id_document' | 'license_document' | 'selfie';

export interface KycProfile {
  id: number;
  user_id: number;
  driver_name: string | null;
  driver_phone: string;
  license_number: string | null;
  license_expiry: string | null;
  national_id_number: string | null;
  kyc_status: KycStatus;
  kyc_rejection_reason: string | null;
  documents: Record<KycDocumentField, boolean>;
  approved_at: string | null;
  updated_at: string;
}

export type KycReviewMode = 'automatic' | 'manual';

export interface FareSettings {
  delivery_base_fee: number;
  delivery_fee_per_km: number;
  commission_rate_trip: number;
  commission_rate_delivery: number;
}

export interface FinancialsBreakdown {
  completed_count: number;
  commission_earned: number;
  driver_earnings: number;
}

export interface FinancialsSummary {
  trips: FinancialsBreakdown;
  deliveries: FinancialsBreakdown;
  total_commission_earned: number;
  total_driver_earnings: number;
}

export interface DashboardStats {
  registered_drivers: number;
  registered_riders: number;
  active_cars: number;
  kyc_pending: number;
  total_trips: number;
  trips_in_progress: number;
  total_deliveries: number;
  total_commission_earned: number;
}

export interface TripRoute {
  origin_city: string;
  destination_city: string;
  trips_count: number;
}

export interface DeliveryZone {
  zone: string;
  deliveries_count: number;
}

export interface DashboardRoutes {
  top_trip_routes: TripRoute[];
  delivery_zone_coverage: DeliveryZone[];
}

export interface LiveTrip {
  id: number;
  driver_name: string | null;
  driver_phone: string | null;
  car: string | null;
  origin_city: string | null;
  destination_city: string | null;
  latitude: number;
  longitude: number;
  departure_date: string | null;
  departure_time: string | null;
}

export type SecurityAlertType = 'repeated_otp_failures' | 'kyc_rejected';

export type SecurityAlertSeverity = 'low' | 'medium' | 'high';

export type SecurityAlertStatus = 'open' | 'acknowledged';

export interface SecurityAlert {
  id: number;
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  message: string;
  user_id: number | null;
  user_name: string | null;
  metadata: Record<string, unknown> | null;
  status: SecurityAlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
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
