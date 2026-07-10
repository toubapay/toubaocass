import 'package:dio/dio.dart';

import '../models.dart';
import 'client.dart';

Future<DriverProfile?> fetchKycStatus() async {
  final response = await ApiClient.instance.dio.get('/driver/kyc');
  if (response.data == null) return null;
  return DriverProfile.fromJson(response.data as Map<String, dynamic>);
}

Future<DriverProfile> submitKyc({
  required String licenseNumber,
  required String licenseExpiry,
  required String nationalIdNumber,
  required String idDocumentPath,
  required String licenseDocumentPath,
  required String selfiePath,
}) async {
  final form = FormData.fromMap({
    'license_number': licenseNumber,
    'license_expiry': licenseExpiry,
    'national_id_number': nationalIdNumber,
    'id_document': await MultipartFile.fromFile(idDocumentPath),
    'license_document': await MultipartFile.fromFile(licenseDocumentPath),
    'selfie': await MultipartFile.fromFile(selfiePath),
  });
  final response = await ApiClient.instance.dio.post('/driver/kyc', data: form);
  return DriverProfile.fromJson(response.data as Map<String, dynamic>);
}
