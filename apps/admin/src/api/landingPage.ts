import { apiClient } from './client';
import type { LandingPageSettings, LandingService, LandingSlide, LandingStep, LandingTrustItem } from './types';

// Settings (branding, nav bar, hero/final CTA text, footer, logo)

export async function fetchLandingPageSettings(): Promise<LandingPageSettings> {
  const { data } = await apiClient.get('/landing-page/settings');
  return data;
}

export async function updateLandingPageSettings(input: Partial<LandingPageSettings>): Promise<LandingPageSettings> {
  const { data } = await apiClient.put('/landing-page/settings', input);
  return data;
}

export async function uploadLandingPageLogo(logo: File): Promise<LandingPageSettings> {
  const form = new FormData();
  form.append('logo', logo);
  const { data } = await apiClient.post('/landing-page/settings/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeLandingPageLogo(): Promise<LandingPageSettings> {
  const { data } = await apiClient.delete('/landing-page/settings/logo');
  return data;
}

// Slides

export type LandingSlideInput = Omit<LandingSlide, 'id'>;

export async function listLandingSlides(): Promise<LandingSlide[]> {
  const { data } = await apiClient.get('/landing-page/slides');
  return data;
}

export async function createLandingSlide(input: Partial<LandingSlideInput>): Promise<LandingSlide> {
  const { data } = await apiClient.post('/landing-page/slides', input);
  return data;
}

export async function updateLandingSlide(id: number, input: Partial<LandingSlideInput>): Promise<LandingSlide> {
  const { data } = await apiClient.put(`/landing-page/slides/${id}`, input);
  return data;
}

export async function deleteLandingSlide(id: number): Promise<void> {
  await apiClient.delete(`/landing-page/slides/${id}`);
}

export async function reorderLandingSlides(ids: number[]): Promise<LandingSlide[]> {
  const { data } = await apiClient.put('/landing-page/slides/reorder', { ids });
  return data;
}

// Services

export type LandingServiceInput = Omit<LandingService, 'id'>;

export async function listLandingServices(): Promise<LandingService[]> {
  const { data } = await apiClient.get('/landing-page/services');
  return data;
}

export async function createLandingService(input: Partial<LandingServiceInput>): Promise<LandingService> {
  const { data } = await apiClient.post('/landing-page/services', input);
  return data;
}

export async function updateLandingService(id: number, input: Partial<LandingServiceInput>): Promise<LandingService> {
  const { data } = await apiClient.put(`/landing-page/services/${id}`, input);
  return data;
}

export async function deleteLandingService(id: number): Promise<void> {
  await apiClient.delete(`/landing-page/services/${id}`);
}

export async function reorderLandingServices(ids: number[]): Promise<LandingService[]> {
  const { data } = await apiClient.put('/landing-page/services/reorder', { ids });
  return data;
}

// Trust band items

export type LandingTrustItemInput = Omit<LandingTrustItem, 'id'>;

export async function listLandingTrustItems(): Promise<LandingTrustItem[]> {
  const { data } = await apiClient.get('/landing-page/trust-items');
  return data;
}

export async function createLandingTrustItem(input: Partial<LandingTrustItemInput>): Promise<LandingTrustItem> {
  const { data } = await apiClient.post('/landing-page/trust-items', input);
  return data;
}

export async function updateLandingTrustItem(id: number, input: Partial<LandingTrustItemInput>): Promise<LandingTrustItem> {
  const { data } = await apiClient.put(`/landing-page/trust-items/${id}`, input);
  return data;
}

export async function deleteLandingTrustItem(id: number): Promise<void> {
  await apiClient.delete(`/landing-page/trust-items/${id}`);
}

export async function reorderLandingTrustItems(ids: number[]): Promise<LandingTrustItem[]> {
  const { data } = await apiClient.put('/landing-page/trust-items/reorder', { ids });
  return data;
}

// How-it-works steps

export type LandingStepInput = Omit<LandingStep, 'id'>;

export async function listLandingSteps(): Promise<LandingStep[]> {
  const { data } = await apiClient.get('/landing-page/steps');
  return data;
}

export async function createLandingStep(input: Partial<LandingStepInput>): Promise<LandingStep> {
  const { data } = await apiClient.post('/landing-page/steps', input);
  return data;
}

export async function updateLandingStep(id: number, input: Partial<LandingStepInput>): Promise<LandingStep> {
  const { data } = await apiClient.put(`/landing-page/steps/${id}`, input);
  return data;
}

export async function deleteLandingStep(id: number): Promise<void> {
  await apiClient.delete(`/landing-page/steps/${id}`);
}

export async function reorderLandingSteps(ids: number[]): Promise<LandingStep[]> {
  const { data } = await apiClient.put('/landing-page/steps/reorder', { ids });
  return data;
}
