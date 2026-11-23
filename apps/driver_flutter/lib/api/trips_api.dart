import 'package:shared_flutter/api/pagination.dart';

import '../models.dart';
import '../utils/offline_cache.dart';
import 'client.dart';

export 'package:shared_flutter/api/pagination.dart';

const _myTripsCacheKey = 'driver_my_trips';

Future<Paginated<Trip>> fetchMyTrips() async {
  final response = await ApiClient.instance.dio.get('/driver/trips');
  final data = response.data as Map<String, dynamic>;
  saveOfflineCache(_myTripsCacheKey, data);
  return Paginated.fromJson(data, Trip.fromJson);
}

/// The driver's last successfully fetched trip list, read back from
/// on-device storage — used when a fresh fetch fails so the home screen can
/// still show the last-known trips instead of going blank while offline.
Future<Paginated<Trip>?> fetchMyTripsFromCache() async {
  final data = await loadOfflineCache<Map<String, dynamic>>(_myTripsCacheKey, (json) => json as Map<String, dynamic>);
  if (data == null) return null;
  return Paginated.fromJson(data, Trip.fromJson);
}

Future<Trip> fetchMyTrip(int tripId) async {
  final response = await ApiClient.instance.dio.get('/driver/trips/$tripId');
  return Trip.fromJson(response.data as Map<String, dynamic>);
}

Future<Trip> createTrip({
  required int carId,
  required int originCityId,
  required int destinationCityId,
  double? departureLatitude,
  double? departureLongitude,
  String? departureAddress,
  required String departureDate,
  required String departureTime,
  required int fare,
  required String rideType,
  String? notes,
}) async {
  final response = await ApiClient.instance.dio.post('/driver/trips', data: {
    'car_id': carId,
    'origin_city_id': originCityId,
    'destination_city_id': destinationCityId,
    if (departureLatitude != null) 'departure_latitude': departureLatitude,
    if (departureLongitude != null) 'departure_longitude': departureLongitude,
    if (departureAddress != null) 'departure_address': departureAddress,
    'departure_date': departureDate,
    'departure_time': departureTime,
    'fare': fare,
    'ride_type': rideType,
    if (notes != null) 'notes': notes,
  });
  return Trip.fromJson(response.data as Map<String, dynamic>);
}

Future<Trip> createInstantTrip({
  required int carId,
  required int originCityId,
  required int destinationCityId,
  double? departureLatitude,
  double? departureLongitude,
  String? departureAddress,
  required int fare,
  required String rideType,
  String? notes,
}) async {
  final response = await ApiClient.instance.dio.post('/driver/trips/instant', data: {
    'car_id': carId,
    'origin_city_id': originCityId,
    'destination_city_id': destinationCityId,
    if (departureLatitude != null) 'departure_latitude': departureLatitude,
    if (departureLongitude != null) 'departure_longitude': departureLongitude,
    if (departureAddress != null) 'departure_address': departureAddress,
    'fare': fare,
    'ride_type': rideType,
    if (notes != null) 'notes': notes,
  });
  return Trip.fromJson(response.data as Map<String, dynamic>);
}

Future<void> cancelTrip(int tripId) async {
  await ApiClient.instance.dio.delete('/driver/trips/$tripId');
}

Future<Trip> startTrip(int tripId) async {
  final response = await ApiClient.instance.dio.post('/driver/trips/$tripId/start');
  return Trip.fromJson(response.data as Map<String, dynamic>);
}

Future<Trip> completeTrip(int tripId) async {
  final response = await ApiClient.instance.dio.post('/driver/trips/$tripId/complete');
  return Trip.fromJson(response.data as Map<String, dynamic>);
}
