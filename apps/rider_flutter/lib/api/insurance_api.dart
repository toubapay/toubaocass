import 'package:dio/dio.dart';

import '../models.dart';
import 'client.dart';
import 'trips_api.dart';

Future<ScannedVehicleInfo> scanVehicleDocument({required String frontPath, String? backPath}) async {
  final form = FormData.fromMap({
    'carte_grise_front': await MultipartFile.fromFile(frontPath),
    if (backPath != null) 'carte_grise_back': await MultipartFile.fromFile(backPath),
  });
  final response = await ApiClient.instance.dio.post('/insurance/vehicles/scan', data: form);
  return ScannedVehicleInfo.fromJson(response.data as Map<String, dynamic>);
}

Future<List<InsuranceQuote>> quoteVehicleInsurance({
  required String vehicleCategory,
  int? vehiclePowerCv,
  int? vehicleSeats,
  required String vehicleAgeBracket,
  required String vehicleUsageType,
  required String coverageType,
}) async {
  final response = await ApiClient.instance.dio.post('/insurance/vehicles/quotes', data: {
    'vehicle_category': vehicleCategory,
    if (vehiclePowerCv != null) 'vehicle_power_cv': vehiclePowerCv,
    if (vehicleSeats != null) 'vehicle_seats': vehicleSeats,
    'vehicle_age_bracket': vehicleAgeBracket,
    'vehicle_usage_type': vehicleUsageType,
    'coverage_type': coverageType,
  });
  final quotes = (response.data as Map<String, dynamic>)['quotes'] as List;
  return quotes.map((e) => InsuranceQuote.fromJson(e as Map<String, dynamic>)).toList();
}

Future<InsurancePolicy> purchaseVehicleInsurance({
  required String vehicleCategory,
  String? make,
  String? model,
  String? plateNumber,
  int? vehiclePowerCv,
  int? vehicleSeats,
  required String vehicleAgeBracket,
  required String vehicleUsageType,
  String? carteGriseFrontPath,
  String? carteGriseBackPath,
  required InsuranceQuote quote,
}) async {
  final response = await ApiClient.instance.dio.post('/insurance/vehicles/policies', data: {
    'vehicle_category': vehicleCategory,
    if (make != null) 'make': make,
    if (model != null) 'model': model,
    if (plateNumber != null) 'plate_number': plateNumber,
    if (vehiclePowerCv != null) 'vehicle_power_cv': vehiclePowerCv,
    if (vehicleSeats != null) 'vehicle_seats': vehicleSeats,
    'vehicle_age_bracket': vehicleAgeBracket,
    'vehicle_usage_type': vehicleUsageType,
    if (carteGriseFrontPath != null) 'carte_grise_front_path': carteGriseFrontPath,
    if (carteGriseBackPath != null) 'carte_grise_back_path': carteGriseBackPath,
    'provider_id': quote.providerId,
    'coverage_type': quote.coverageType,
    'plan_name': quote.planName,
    'annual_premium': quote.annualPremium,
  });
  return InsurancePolicy.fromJson(response.data as Map<String, dynamic>);
}

Future<Paginated<InsurancePolicy>> fetchMyPolicies() async {
  final response = await ApiClient.instance.dio.get('/insurance/my-policies');
  return Paginated.fromJson(response.data as Map<String, dynamic>, InsurancePolicy.fromJson);
}
