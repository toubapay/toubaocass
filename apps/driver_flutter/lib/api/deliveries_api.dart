import '../models.dart';
import 'client.dart';
import 'trips_api.dart';

Future<Paginated<Delivery>> fetchAvailableDeliveries() async {
  final response = await ApiClient.instance.dio.get('/driver/deliveries/available');
  return Paginated.fromJson(response.data as Map<String, dynamic>, Delivery.fromJson);
}

Future<Paginated<Delivery>> fetchMyDeliveries() async {
  final response = await ApiClient.instance.dio.get('/driver/deliveries');
  return Paginated.fromJson(response.data as Map<String, dynamic>, Delivery.fromJson);
}

Future<Delivery> fetchDelivery(int deliveryId) async {
  final response = await ApiClient.instance.dio.get('/driver/deliveries/$deliveryId');
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<Delivery> acceptDelivery(int deliveryId) async {
  final response = await ApiClient.instance.dio.post('/driver/deliveries/$deliveryId/accept');
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<Delivery> markPickedUp(int deliveryId) async {
  final response = await ApiClient.instance.dio.post('/driver/deliveries/$deliveryId/pickup');
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<Delivery> markDelivered(int deliveryId) async {
  final response = await ApiClient.instance.dio.post('/driver/deliveries/$deliveryId/deliver');
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<void> updateDeliveryLocation(int deliveryId, double latitude, double longitude) async {
  await ApiClient.instance.dio.post('/driver/deliveries/$deliveryId/location', data: {'latitude': latitude, 'longitude': longitude});
}
