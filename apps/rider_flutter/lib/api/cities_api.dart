import '../models.dart';
import 'client.dart';

Future<List<City>> fetchCities() async {
  final response = await ApiClient.instance.dio.get('/cities');
  final data = response.data as List;
  return data.map((e) => City.fromJson(e as Map<String, dynamic>)).toList();
}
