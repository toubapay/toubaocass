import 'client.dart';

Future<Map<String, bool>> fetchModuleStatus() async {
  final response = await ApiClient.instance.dio.get('/modules/status');
  return Map<String, dynamic>.from(response.data as Map).map((key, value) => MapEntry(key, value as bool));
}
