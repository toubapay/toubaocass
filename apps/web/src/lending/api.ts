import { apiClient } from '../api/client';

export interface LendingNavLink {
  label_fr: string;
  label_ar: string;
  href: string;
}

export interface LendingSettings {
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  primary_dark_color: string;
  accent_color: string;
  nav_links: LendingNavLink[];
  open_app_label_fr: string;
  open_app_label_ar: string;
  hero_cta_primary_fr: string;
  hero_cta_primary_ar: string;
  hero_cta_secondary_fr: string;
  hero_cta_secondary_ar: string;
  final_cta_title_fr: string;
  final_cta_title_ar: string;
  final_cta_subtitle_fr: string;
  final_cta_subtitle_ar: string;
  final_cta_button_fr: string;
  final_cta_button_ar: string;
  footer_blurb_fr: string;
  footer_blurb_ar: string;
  footer_company_fr: string;
  footer_company_ar: string;
}

export interface LendingSlide {
  id: number;
  emoji: string;
  eyebrow_fr: string;
  eyebrow_ar: string;
  title_fr: string;
  title_ar: string;
  subtitle_fr: string;
  subtitle_ar: string;
}

export interface LendingService {
  id: number;
  icon: string;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
}

export interface LendingTrustItem {
  id: number;
  icon: string;
  text_fr: string;
  text_ar: string;
}

export interface LendingStep {
  id: number;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
}

export interface LendingContent {
  settings: LendingSettings;
  slides: LendingSlide[];
  services: LendingService[];
  trust_items: LendingTrustItem[];
  steps: LendingStep[];
}

/** Public, unauthenticated — safe to call before login, same as /modules/status. */
export async function fetchLendingContent(): Promise<LendingContent> {
  const { data } = await apiClient.get('/landing-page');
  return data;
}
