import 'package:shared_flutter/api/pagination.dart';

import '../models.dart';
import 'client.dart';

export 'package:shared_flutter/api/pagination.dart';

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
