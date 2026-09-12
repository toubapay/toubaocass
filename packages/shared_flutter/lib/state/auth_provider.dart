import 'package:flutter/foundation.dart';

import '../api/auth_api.dart' as auth_api;
import '../api/client.dart';
import '../models.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = true;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  Future<void> bootstrap() async {
    final token = await ApiClient.instance.loadStoredToken();
    if (token != null) {
      try {
        _user = await auth_api.fetchMe();
      } catch (_) {
        await ApiClient.instance.setToken(null);
      }
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> sendOtp(String phone) => auth_api.requestOtp(phone);

  Future<User> confirmOtp(String phone, String code) async {
    final result = await auth_api.verifyOtp(phone, code);
    await ApiClient.instance.setToken(result.token);
    _user = result.user;
    notifyListeners();
    return result.user;
  }

  Future<void> refreshUser() async {
    _user = await auth_api.fetchMe();
    notifyListeners();
  }

  void setUser(User user) {
    _user = user;
    notifyListeners();
  }

  Future<void> signOut() async {
    try {
      await auth_api.logout();
    } catch (_) {
      // ignore network errors on logout; clear local session regardless
    }
    await ApiClient.instance.setToken(null);
    _user = null;
    notifyListeners();
  }
}
