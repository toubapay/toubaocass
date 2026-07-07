import { apiClient } from './client';
import { Car, CarType } from './types';

export interface CarInput {
  type: CarType;
  make: string;
  model: string;
  year?: number;
  color?: string;
  plate_number: string;
  seats: number;
}

export async function fetchMyCars(): Promise<Car[]> {
  const { data } = await apiClient.get('/driver/cars');
  return data;
}

export async function createCar(input: CarInput): Promise<Car> {
  const { data } = await apiClient.post('/driver/cars', input);
  return data;
}

export async function updateCar(carId: number, input: Partial<CarInput>): Promise<Car> {
  const { data } = await apiClient.put(`/driver/cars/${carId}`, input);
  return data;
}

export async function deleteCar(carId: number): Promise<void> {
  await apiClient.delete(`/driver/cars/${carId}`);
}
