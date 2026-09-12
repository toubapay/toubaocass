import '../models.dart';
import 'client.dart';

class AuthResult {
  final String token;
  final User user;
  AuthResult({required this.token, required this.user});
}

Future<void> requestOtp(String phone) async {
  await ApiClient.instance.dio.post('/auth/otp/request', data: {'phone': phone});
}

Future<AuthResult> verifyOtp(String phone, String code) async {
  final response = await ApiClient.instance.dio.post('/auth/otp/verify', data: {'phone': phone, 'code': code});
  final data = response.data as Map<String, dynamic>;
  return AuthResult(token: data['token'] as String, user: User.fromJson(data['user'] as Map<String, dynamic>));
}

Future<User> fetchMe() async {
  final response = await ApiClient.instance.dio.get('/me');
  return User.fromJson(response.data as Map<String, dynamic>);
}

Future<User> updateProfile({required String name, String? email}) async {
  final response = await ApiClient.instance.dio.put('/profile', data: {
    'name': name,
    if (email != null && email.isNotEmpty) 'email': email,
  });
  return User.fromJson(response.data as Map<String, dynamic>);
}

Future<void> registerPushToken(String token) async {
  await ApiClient.instance.dio.post('/fcm-token', data: {'fcm_token': token});
}

Future<void> logout() async {
  await ApiClient.instance.dio.post('/logout');
}
