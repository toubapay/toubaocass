import '../models.dart';
import 'client.dart';

class Paginated<T> {
  final List<T> data;
  Paginated({required this.data});

  factory Paginated.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    return Paginated(data: (json['data'] as List).map((e) => fromJson(e as Map<String, dynamic>)).toList());
  }
}

Future<Paginated<Trip>> fetchMyTrips() async {
  final response = await ApiClient.instance.dio.get('/driver/trips');
  return Paginated.fromJson(response.data as Map<String, dynamic>, Trip.fromJson);
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
