import '../models.dart';
import 'client.dart';
import 'trips_api.dart';

class DeliveryQuote {
  final double distanceKm;
  final int fee;
  DeliveryQuote({required this.distanceKm, required this.fee});

  factory DeliveryQuote.fromJson(Map<String, dynamic> json) =>
      DeliveryQuote(distanceKm: (json['distance_km'] as num).toDouble(), fee: json['fee'] as int);
}

Future<DeliveryQuote> quoteDelivery({
  required double pickupLatitude,
  required double pickupLongitude,
  required double receiverLatitude,
  required double receiverLongitude,
}) async {
  final response = await ApiClient.instance.dio.post('/deliveries/quote', data: {
    'pickup_latitude': pickupLatitude,
    'pickup_longitude': pickupLongitude,
    'receiver_latitude': receiverLatitude,
    'receiver_longitude': receiverLongitude,
  });
  return DeliveryQuote.fromJson(response.data as Map<String, dynamic>);
}

Map<String, dynamic> _deliveryPayload({
  required String receiverName,
  required String receiverPhone,
  required String receiverAddressLine,
  required double receiverLatitude,
  required double receiverLongitude,
  required String pickupAddressLine,
  required double pickupLatitude,
  required double pickupLongitude,
  required String packageType,
  String? notes,
  String paymentMethod = 'cash',
}) =>
    {
      'receiver_name': receiverName,
      'receiver_phone': receiverPhone,
      'receiver_address_line': receiverAddressLine,
      'receiver_latitude': receiverLatitude,
      'receiver_longitude': receiverLongitude,
      'pickup_address_line': pickupAddressLine,
      'pickup_latitude': pickupLatitude,
      'pickup_longitude': pickupLongitude,
      'package_type': packageType,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      'payment_method': paymentMethod,
    };

Future<Delivery> createDelivery({
  required String receiverName,
  required String receiverPhone,
  required String receiverAddressLine,
  required double receiverLatitude,
  required double receiverLongitude,
  required String pickupAddressLine,
  required double pickupLatitude,
  required double pickupLongitude,
  required String packageType,
  String? notes,
  String paymentMethod = 'cash',
}) async {
  final response = await ApiClient.instance.dio.post(
    '/deliveries',
    data: _deliveryPayload(
      receiverName: receiverName,
      receiverPhone: receiverPhone,
      receiverAddressLine: receiverAddressLine,
      receiverLatitude: receiverLatitude,
      receiverLongitude: receiverLongitude,
      pickupAddressLine: pickupAddressLine,
      pickupLatitude: pickupLatitude,
      pickupLongitude: pickupLongitude,
      packageType: packageType,
      notes: notes,
      paymentMethod: paymentMethod,
    ),
  );
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<Delivery> updateDelivery(
  int deliveryId, {
  required String receiverName,
  required String receiverPhone,
  required String receiverAddressLine,
  required double receiverLatitude,
  required double receiverLongitude,
  required String pickupAddressLine,
  required double pickupLatitude,
  required double pickupLongitude,
  required String packageType,
  String? notes,
  String paymentMethod = 'cash',
}) async {
  final response = await ApiClient.instance.dio.put(
    '/deliveries/$deliveryId',
    data: _deliveryPayload(
      receiverName: receiverName,
      receiverPhone: receiverPhone,
      receiverAddressLine: receiverAddressLine,
      receiverLatitude: receiverLatitude,
      receiverLongitude: receiverLongitude,
      pickupAddressLine: pickupAddressLine,
      pickupLatitude: pickupLatitude,
      pickupLongitude: pickupLongitude,
      packageType: packageType,
      notes: notes,
      paymentMethod: paymentMethod,
    ),
  );
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<Delivery>> fetchMyDeliveries() async {
  final response = await ApiClient.instance.dio.get('/deliveries');
  return Paginated.fromJson(response.data as Map<String, dynamic>, Delivery.fromJson);
}

Future<Delivery> fetchDelivery(int deliveryId) async {
  final response = await ApiClient.instance.dio.get('/deliveries/$deliveryId');
  return Delivery.fromJson(response.data as Map<String, dynamic>);
}

Future<void> cancelDelivery(int deliveryId) async {
  await ApiClient.instance.dio.delete('/deliveries/$deliveryId');
}
