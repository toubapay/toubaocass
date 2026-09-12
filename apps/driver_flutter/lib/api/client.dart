import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _tokenKey = 'intercity_driver_flutter_token';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:8000/api');

// Same key used by the native Maps SDK (see android/app/build.gradle.kts and
// ios/Flutter/Secrets.xcconfig) — additionally passed here via
// `--dart-define=GOOGLE_MAPS_API_KEY=...` so the address picker's Places
// Autocomplete/Details REST calls (plain http requests, not part of the
// native SDK) can use it too.
const googleMapsApiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY', defaultValue: '');

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(baseUrl: apiBaseUrl, headers: {'Accept': 'application/json'}));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        handler.next(options);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();

  static const _storage = FlutterSecureStorage();

  late final Dio _dio;
  String? _token;

  Dio get dio => _dio;

  Future<String?> loadStoredToken() async {
    _token = await _storage.read(key: _tokenKey);
    return _token;
  }

  Future<void> setToken(String? token) async {
    _token = token;
    if (token != null) {
      await _storage.write(key: _tokenKey, value: token);
    } else {
      await _storage.delete(key: _tokenKey);
    }
  }
}

String extractErrorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final errors = data['errors'];
      if (errors is Map && errors.isNotEmpty) {
        final firstList = errors.values.first;
        if (firstList is List && firstList.isNotEmpty) {
          return firstList.first.toString();
        }
      }
      final message = data['message'];
      if (message is String) return message;
    }
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}
