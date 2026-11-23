import '../models.dart';
import '../utils/offline_cache.dart';
import 'client.dart';
import 'trips_api.dart';

const _myBookingsCacheKey = 'rider_my_bookings';

Future<Booking> bookTrip(int tripId, int seats, {String paymentMethod = 'cash'}) async {
  final response = await ApiClient.instance.dio
      .post('/trips/$tripId/bookings', data: {'seats': seats, 'payment_method': paymentMethod});
  return Booking.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<Booking>> fetchMyBookings() async {
  final response = await ApiClient.instance.dio.get('/bookings');
  final data = response.data as Map<String, dynamic>;
  saveOfflineCache(_myBookingsCacheKey, data);
  return Paginated.fromJson(data, Booking.fromJson);
}

/// The rider's last successfully fetched bookings, read back from on-device
/// storage — used when a fresh fetch fails so the bookings screen can still
/// show the last-known list instead of going blank while offline.
Future<Paginated<Booking>?> fetchMyBookingsFromCache() async {
  final data = await loadOfflineCache<Map<String, dynamic>>(_myBookingsCacheKey, (json) => json as Map<String, dynamic>);
  if (data == null) return null;
  return Paginated.fromJson(data, Booking.fromJson);
}

Future<void> cancelBooking(int bookingId) async {
  await ApiClient.instance.dio.delete('/bookings/$bookingId');
}

Future<Booking> updateBooking(int bookingId, int seats) async {
  final response = await ApiClient.instance.dio.put('/bookings/$bookingId', data: {'seats': seats});
  return Booking.fromJson(response.data as Map<String, dynamic>);
}
