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

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
  links?: unknown;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
