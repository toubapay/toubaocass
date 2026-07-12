import '../models.dart';
import 'client.dart';

Future<List<Address>> fetchAddresses() async {
  final response = await ApiClient.instance.dio.get('/addresses');
  return (response.data as List).map((e) => Address.fromJson(e as Map<String, dynamic>)).toList();
}

Future<Address> createAddress({
  required String label,
  required String addressLine,
  double? latitude,
  double? longitude,
  bool isDefault = false,
}) async {
  final response = await ApiClient.instance.dio.post('/addresses', data: {
    'label': label,
    'address_line': addressLine,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
    'is_default': isDefault,
  });
  return Address.fromJson(response.data as Map<String, dynamic>);
}

Future<Address> updateAddress(
  int id, {
  required String label,
  required String addressLine,
  double? latitude,
  double? longitude,
  bool isDefault = false,
}) async {
  final response = await ApiClient.instance.dio.put('/addresses/$id', data: {
    'label': label,
    'address_line': addressLine,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
    'is_default': isDefault,
  });
  return Address.fromJson(response.data as Map<String, dynamic>);
}

Future<void> deleteAddress(int id) async {
  await ApiClient.instance.dio.delete('/addresses/$id');
}
