import '../models.dart';
import 'client.dart';
import 'pagination.dart';

Future<Paginated<AnandoRide>> fetchAnandoRides() async {
  final response = await ApiClient.instance.dio.get('/anando-rides');
  return Paginated.fromJson(response.data as Map<String, dynamic>, AnandoRide.fromJson);
}

Future<AnandoRide> postAnandoRide({
  required int originCityId,
  required int destinationCityId,
  String? departurePoint,
  double? departureLatitude,
  double? departureLongitude,
  required int pricePerSeat,
  required int totalSeats,
  String? vehicleInfo,
  String? notes,
}) async {
  final response = await ApiClient.instance.dio.post('/anando-rides', data: {
    'origin_city_id': originCityId,
    'destination_city_id': destinationCityId,
    if (departurePoint != null) 'departure_point': departurePoint,
    if (departureLatitude != null) 'departure_latitude': departureLatitude,
    if (departureLongitude != null) 'departure_longitude': departureLongitude,
    'price_per_seat': pricePerSeat,
    'total_seats': totalSeats,
    if (vehicleInfo != null) 'vehicle_info': vehicleInfo,
    if (notes != null) 'notes': notes,
  });
  return AnandoRide.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<AnandoRide>> fetchMyAnandoRides() async {
  final response = await ApiClient.instance.dio.get('/anando-rides/mine');
  return Paginated.fromJson(response.data as Map<String, dynamic>, AnandoRide.fromJson);
}

Future<Paginated<AnandoRideBooking>> fetchMyAnandoBookings() async {
  final response = await ApiClient.instance.dio.get('/anando-rides/my-bookings');
  return Paginated.fromJson(response.data as Map<String, dynamic>, AnandoRideBooking.fromJson);
}

Future<AnandoRide> fetchAnandoRide(int rideId) async {
  final response = await ApiClient.instance.dio.get('/anando-rides/$rideId');
  return AnandoRide.fromJson(response.data as Map<String, dynamic>);
}

Future<AnandoRideBooking> joinAnandoRide(int rideId, {required int seats, String paymentMethod = 'cash'}) async {
  final response = await ApiClient.instance.dio
      .post('/anando-rides/$rideId/join', data: {'seats': seats, 'payment_method': paymentMethod});
  return AnandoRideBooking.fromJson(response.data as Map<String, dynamic>);
}

Future<void> cancelAnandoRide(int rideId) async {
  await ApiClient.instance.dio.delete('/anando-rides/$rideId');
}

Future<AnandoRideBooking> updateAnandoRideBooking(int bookingId, int seats) async {
  final response = await ApiClient.instance.dio.put('/anando-ride-bookings/$bookingId', data: {'seats': seats});
  return AnandoRideBooking.fromJson(response.data as Map<String, dynamic>);
}

Future<void> cancelAnandoRideBooking(int bookingId) async {
  await ApiClient.instance.dio.delete('/anando-ride-bookings/$bookingId');
}

Future<AnandoRide> startAnandoRide(int rideId) async {
  final response = await ApiClient.instance.dio.post('/anando-rides/$rideId/start');
  return AnandoRide.fromJson(response.data as Map<String, dynamic>);
}

Future<AnandoRide> completeAnandoRide(int rideId) async {
  final response = await ApiClient.instance.dio.post('/anando-rides/$rideId/complete');
  return AnandoRide.fromJson(response.data as Map<String, dynamic>);
}

Future<void> rateAnandoRide(int rideId, {required int rateeId, required int score, String? comment}) async {
  await ApiClient.instance.dio.post('/anando-rides/$rideId/rate', data: {
    'ratee_id': rateeId,
    'score': score,
    if (comment != null && comment.isNotEmpty) 'comment': comment,
  });
}

Future<void> updateAnandoRideLocation(int rideId, double latitude, double longitude) async {
  await ApiClient.instance.dio.post('/anando-rides/$rideId/location', data: {'latitude': latitude, 'longitude': longitude});
}

const anandoActiveWindowHours = 5;

/// Mirrors the RN apps' `isAnandoRideStale()` — a ride with no fixed
/// departure instant only stays "active" for [anandoActiveWindowHours]
/// after posting; past that it reads as stale here immediately, matching
/// the backend's `anando:terminate-stale` scheduled command rather than
/// waiting on it.
bool isAnandoRideStale(AnandoRide ride) {
  final posted = DateTime.tryParse(ride.createdAt);
  if (posted == null) return false;
  final hoursSincePosted = DateTime.now().toUtc().difference(posted.toUtc()).inMinutes / 60.0;
  return hoursSincePosted > anandoActiveWindowHours;
}
