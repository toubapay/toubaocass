import 'package:dio/dio.dart';

import '../models.dart';
import 'client.dart';

Future<List<Car>> fetchMyCars() async {
  final response = await ApiClient.instance.dio.get('/driver/cars');
  return (response.data as List).map((e) => Car.fromJson(e as Map<String, dynamic>)).toList();
}

Future<Car> createCar({
  required String type,
  required String make,
  required String model,
  int? year,
  String? color,
  required String plateNumber,
  required int seats,
  String? photoPath,
}) async {
  final data = <String, dynamic>{
    'type': type,
    'make': make,
    'model': model,
    if (year != null) 'year': year,
    if (color != null) 'color': color,
    'plate_number': plateNumber,
    'seats': seats,
  };
  if (photoPath != null) data['photo'] = await MultipartFile.fromFile(photoPath);
  final response = await ApiClient.instance.dio.post('/driver/cars', data: FormData.fromMap(data));
  return Car.fromJson(response.data as Map<String, dynamic>);
}

Future<void> deleteCar(int carId) async {
  await ApiClient.instance.dio.delete('/driver/cars/$carId');
}
