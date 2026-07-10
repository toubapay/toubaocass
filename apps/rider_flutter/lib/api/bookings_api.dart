import '../models.dart';
import 'client.dart';
import 'trips_api.dart';

Future<Booking> bookTrip(int tripId, int seats) async {
  final response = await ApiClient.instance.dio.post('/trips/$tripId/bookings', data: {'seats': seats});
  return Booking.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<Booking>> fetchMyBookings() async {
  final response = await ApiClient.instance.dio.get('/bookings');
  return Paginated.fromJson(response.data as Map<String, dynamic>, Booking.fromJson);
}

Future<void> cancelBooking(int bookingId) async {
  await ApiClient.instance.dio.delete('/bookings/$bookingId');
}
