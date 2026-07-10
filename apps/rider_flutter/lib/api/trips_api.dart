import '../models.dart';
import 'client.dart';

class Paginated<T> {
  final List<T> data;
  final int currentPage;
  final int lastPage;

  Paginated({required this.data, required this.currentPage, required this.lastPage});

  factory Paginated.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    final meta = json['meta'] as Map<String, dynamic>?;
    return Paginated(
      data: (json['data'] as List).map((e) => fromJson(e as Map<String, dynamic>)).toList(),
      currentPage: meta?['current_page'] as int? ?? 1,
      lastPage: meta?['last_page'] as int? ?? 1,
    );
  }
}

Future<Paginated<Trip>> searchTrips({
  int? originCityId,
  int? destinationCityId,
  String? date,
  String? rideType,
  int? seats,
  double? lat,
  double? lng,
  double? radiusKm,
}) async {
  final response = await ApiClient.instance.dio.get('/trips', queryParameters: {
    if (originCityId != null) 'origin_city_id': originCityId,
    if (destinationCityId != null) 'destination_city_id': destinationCityId,
    if (date != null) 'date': date,
    if (rideType != null) 'ride_type': rideType,
    if (seats != null) 'seats': seats,
    if (lat != null) 'lat': lat,
    if (lng != null) 'lng': lng,
    if (radiusKm != null) 'radius_km': radiusKm,
  });
  return Paginated.fromJson(response.data as Map<String, dynamic>, Trip.fromJson);
}

Future<Trip> fetchTrip(int tripId) async {
  final response = await ApiClient.instance.dio.get('/trips/$tripId');
  return Trip.fromJson(response.data as Map<String, dynamic>);
}
