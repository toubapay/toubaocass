import '../models.dart';
import 'client.dart';
import 'trips_api.dart';

Future<DriverProfile> updateDriverAvailability({required bool isOnline, double? latitude, double? longitude}) async {
  final response = await ApiClient.instance.dio.put('/driver/availability', data: {
    'is_online': isOnline,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
  });
  return DriverProfile.fromJson(response.data as Map<String, dynamic>);
}

Future<void> updateDriverLocation(double latitude, double longitude) async {
  await ApiClient.instance.dio.post('/driver/location', data: {'latitude': latitude, 'longitude': longitude});
}

Future<Paginated<DemLeguiRequest>> fetchAvailableDemLeguiRequests() async {
  final response = await ApiClient.instance.dio.get('/driver/dem-legui/requests');
  return Paginated.fromJson(response.data as Map<String, dynamic>, DemLeguiRequest.fromJson);
}

Future<DemLeguiTrip> acceptDemLeguiRequest(int requestId, {int? carId}) async {
  final response = await ApiClient.instance.dio
      .post('/driver/dem-legui/requests/$requestId/accept', data: carId != null ? {'car_id': carId} : {});
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<DemLeguiTrip>> fetchMyDemLeguiTrips() async {
  final response = await ApiClient.instance.dio.get('/driver/dem-legui/trips/mine');
  return Paginated.fromJson(response.data as Map<String, dynamic>, DemLeguiTrip.fromJson);
}

Future<DemLeguiTrip> fetchDemLeguiTrip(int tripId) async {
  final response = await ApiClient.instance.dio.get('/dem-legui/trips/$tripId');
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiTrip> arriveAtDemLeguiPickup(int tripId) async {
  final response = await ApiClient.instance.dio.post('/driver/dem-legui/trips/$tripId/arrived');
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiTrip> startDemLeguiTrip(int tripId) async {
  final response = await ApiClient.instance.dio.post('/driver/dem-legui/trips/$tripId/start');
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<DemLeguiTrip> completeDemLeguiTrip(int tripId) async {
  final response = await ApiClient.instance.dio.post('/driver/dem-legui/trips/$tripId/complete');
  return DemLeguiTrip.fromJson(response.data as Map<String, dynamic>);
}

Future<void> updateDemLeguiTripLocation(int tripId, double latitude, double longitude) async {
  await ApiClient.instance.dio
      .post('/driver/dem-legui/trips/$tripId/location', data: {'latitude': latitude, 'longitude': longitude});
}

Future<List<Message>> fetchDemLeguiMessages(int requestId) async {
  final response = await ApiClient.instance.dio.get('/dem-legui/requests/$requestId/messages');
  return (response.data as List).map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
}

Future<Message> sendDemLeguiMessage(int requestId, String body) async {
  final response = await ApiClient.instance.dio.post('/dem-legui/requests/$requestId/messages', data: {'body': body});
  return Message.fromJson(response.data as Map<String, dynamic>);
}
