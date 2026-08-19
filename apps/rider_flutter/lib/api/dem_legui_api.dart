import '../models.dart';
import 'client.dart';

class DemLeguiQuote {
  final double distanceKm;
  final int farePerSeat;
  final int fareTotal;

  DemLeguiQuote({required this.distanceKm, required this.farePerSeat, required this.fareTotal});

  factory DemLeguiQuote.fromJson(Map<String, dynamic> json) => DemLeguiQuote(
        distanceKm: (json['distance_km'] as num).toDouble(),
        farePerSeat: json['fare_per_seat'] as int,
        fareTotal: json['fare_total'] as int,
      );
}

Future<DemLeguiQuote> quoteDemLeguiRequest({
  required double pickupLatitude,
  required double pickupLongitude,
  required int destinationCityId,
  int seatsRequested = 1,
}) async {
  final response = await ApiClient.instance.dio.post('/dem-legui/requests/quote', data: {
    'pickup_latitude': pickupLatitude,
    'pickup_longitude': pickupLongitude,
    'destination_city_id': destinationCityId,
    'seats_requested': seatsRequested,
  });
  return DemLeguiQuote.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiRequest> createDemLeguiRequest({
  required double pickupLatitude,
  required double pickupLongitude,
  String? pickupAddress,
  required int destinationCityId,
  int seatsRequested = 1,
  String paymentMethod = 'cash',
}) async {
  final response = await ApiClient.instance.dio.post('/dem-legui/requests', data: {
    'pickup_latitude': pickupLatitude,
    'pickup_longitude': pickupLongitude,
    if (pickupAddress != null) 'pickup_address': pickupAddress,
    'destination_city_id': destinationCityId,
    'seats_requested': seatsRequested,
    'payment_method': paymentMethod,
  });
  return DemLeguiRequest.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiRequest> fetchDemLeguiRequest(int requestId) async {
  final response = await ApiClient.instance.dio.get('/dem-legui/requests/$requestId');
  return DemLeguiRequest.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiRequest?> fetchMyActiveDemLeguiRequest() async {
  final response = await ApiClient.instance.dio.get('/dem-legui/requests/mine/active');
  final data = response.data is Map ? (response.data as Map)['data'] : null;
  if (data == null) return null;
  return DemLeguiRequest.fromJson(data as Map<String, dynamic>);
}

Future<void> cancelDemLeguiRequest(int requestId) async {
  await ApiClient.instance.dio.delete('/dem-legui/requests/$requestId');
}

Future<DemLeguiTrip> fetchDemLeguiTrip(int tripId) async {
  final response = await ApiClient.instance.dio.get('/dem-legui/trips/$tripId');
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<List<Message>> fetchDemLeguiMessages(int requestId) async {
  final response = await ApiClient.instance.dio.get('/dem-legui/requests/$requestId/messages');
  return (response.data as List).map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
}

Future<Message> sendDemLeguiMessage(int requestId, String body) async {
  final response = await ApiClient.instance.dio.post('/dem-legui/requests/$requestId/messages', data: {'body': body});
  return Message.fromJson(response.data as Map<String, dynamic>);
}
