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
  dem_legui_base_fare: number;
  dem_legui_fare_per_km: number;
  commission_rate_trip: number;
  commission_rate_delivery: number;
  delivery_max_active_per_driver: number | null;
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

export interface FinancialReportTotals {
  gross_revenue: number;
  commission_total: number;
  driver_earnings_total: number;
  rider_spending_total: number;
  trips_count: number;
  dem_legui_count: number;
  deliveries_count: number;
  anando_count: number;
  active_drivers_count: number;
  active_riders_count: number;
}

export interface FinancialReportServiceRow {
  service: 'trip' | 'dem_legui' | 'delivery' | 'anando';
  label: string;
  count: number;
  gross: number;
  commission: number;
  driver_earnings: number;
}

export interface FinancialReportDestinationRow {
  city: string;
  count: number;
  gross: number;
  commission: number;
  driver_earnings: number;
}

export interface FinancialReportVehicleCategoryRow {
  ride_type: string;
  label: string;
  count: number;
  gross: number;
  commission: number;
  driver_earnings: number;
}

export interface FinancialReportDriverRow {
  driver_id: number;
  name: string | null;
  phone: string | null;
  count: number;
  gross: number;
  commission: number;
  driver_earnings: number;
}

export interface FinancialReport {
  range: { from: string | null; to: string | null };
  totals: FinancialReportTotals;
  by_service: FinancialReportServiceRow[];
  by_destination: FinancialReportDestinationRow[];
  by_vehicle_category: FinancialReportVehicleCategoryRow[];
  by_driver: FinancialReportDriverRow[];
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

export type LiveTripType = 'trip' | 'anando' | 'dem_legui';

export interface LiveTrip {
  type: LiveTripType;
  id: number;
  driver_name: string | null;
  driver_phone: string | null;
  car: string | null;
  origin_city: string | null;
  destination_city: string | null;
  latitude: number;
  longitude: number;
  // false only for a scheduled Trip whose driver hasn't sent a GPS ping
  // yet — latitude/longitude are then its recorded departure point, not a
  // live position.
  is_live: boolean;
  updated_at: string | null;
}

export type SecurityAlertType = 'repeated_otp_failures' | 'repeated_pin_failures' | 'kyc_rejected' | 'rider_sos';

export type SecurityAlertSeverity = 'low' | 'medium' | 'high';

export type SecurityAlertStatus = 'open' | 'acknowledged';

export interface SecurityAlertParty {
  role: 'driver' | 'rider' | 'sender';
  name: string | null;
  phone: string | null;
}

export interface SecurityAlertMetadata {
  kind?: string;
  ride_id?: number;
  latitude?: number | null;
  longitude?: number | null;
  tracking_url?: string;
  parties?: SecurityAlertParty[];
  [key: string]: unknown;
}

export interface SecurityAlert {
  id: number;
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  message: string;
  user_id: number | null;
  user_name: string | null;
  user_phone: string | null;
  metadata: SecurityAlertMetadata | null;
  status: SecurityAlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface BackupEntry {
  path: string;
  date: string;
  size_bytes: number;
}

export interface BackupsResponse {
  disk: string;
  reachable: boolean;
  backups: BackupEntry[];
}

export interface AuditLogEntry {
  id: number;
  admin_name: string | null;
  action: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
  status?: AdminStatus;
}

export interface InsuranceProvider {
  id: number;
  code: string;
  name: string;
  description: string | null;
  commission_rate: number;
  is_active: boolean;
  has_api_credentials: boolean;
  created_at: string;
}

export interface CreateInsuranceProviderInput {
  code: string;
  name: string;
  description?: string;
  commission_rate: number;
  api_base_url?: string;
  api_key?: string;
}

export interface UpdateInsuranceProviderInput {
  name?: string;
  description?: string;
  commission_rate?: number;
  is_active?: boolean;
  api_base_url?: string;
  api_key?: string;
}

export type InsuranceCoverageType = 'tiers_simple' | 'tiers_collision' | 'tous_risques';

export interface InsurancePolicy {
  id: number;
  driver_name: string;
  driver_phone: string;
  car: string;
  provider_name: string;
  coverage_type: InsuranceCoverageType;
  plan_name: string;
  annual_premium: number;
  commission_amount: number | null;
  commission_rate: number | null;
  policy_number: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
  links?: unknown;
}

export interface Module {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  config: Record<string, unknown> | null;
  is_enabled: boolean;
  enabled_for_rider: boolean;
  enabled_for_driver: boolean;
  enabled_at: string | null;
  disabled_at: string | null;
  created_at: string;
}

export interface CreateModuleInput {
  key: string;
  name: string;
  description?: string;
  category?: string;
  is_enabled?: boolean;
}

export interface UpdateModuleInput {
  name?: string;
  description?: string;
  category?: string;
  enabled_for_rider?: boolean;
  enabled_for_driver?: boolean;
}

export type TripStatus = 'scheduled' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export interface AdminTrip {
  id: number;
  status: TripStatus;
  origin_city: string | null;
  destination_city: string | null;
  departure_date: string;
  departure_time: string;
  fare: number;
  ride_type: string;
  total_seats: number;
  available_seats: number;
  confirmed_bookings_count: number;
  driver_id: number;
  driver_name: string | null;
  driver_phone: string | null;
  car: string | null;
  created_at: string;
}

export type DeliveryStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export interface AdminDelivery {
  id: number;
  status: DeliveryStatus;
  package_type: string;
  pickup_address_line: string;
  receiver_name: string;
  receiver_address_line: string;
  fee: number;
  sender_id: number;
  sender_name: string | null;
  sender_phone: string | null;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  created_at: string;
}

export interface EligibleDriver {
  id: number;
  name: string | null;
  phone: string;
}

export type DemLeguiTripStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type DemLeguiRequestStatus = 'pending' | 'matched' | 'cancelled' | 'expired';

export interface DemLeguiCar {
  id: number;
  make: string;
  model: string;
  plate_number: string;
  seats: number;
}

export interface DemLeguiCity {
  id: number;
  name: string;
}

export interface DemLeguiClient {
  id: number;
  rider: { id: number; name: string | null; phone: string };
  pickup_address: string;
  seats_requested: number;
  fare_total: number;
  payment_method: 'cash' | 'wallet';
  status: DemLeguiRequestStatus;
}

export interface AdminDemLeguiTrip {
  id: number;
  driver: {
    id: number;
    name: string | null;
    phone: string;
    rating: number;
  };
  car: DemLeguiCar | null;
  destination_city: DemLeguiCity | null;
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
  requests: DemLeguiClient[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
