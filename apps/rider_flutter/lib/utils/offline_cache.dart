import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

const _keyPrefix = 'intercity_offline_cache_';

/// Best-effort on-device cache for API responses so a screen can still show
/// the last-known data when a fetch fails (no connectivity, backend down)
/// instead of an empty/error state. Callers store the raw decoded JSON they
/// got back from the API — not model instances — and re-parse it the same
/// way as a fresh response when reading it back.
Future<void> saveOfflineCache(String key, Object value) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_keyPrefix$key', jsonEncode(value));
  } catch (_) {
    // Caching is a nice-to-have, never worth failing the caller over.
  }
}

Future<T?> loadOfflineCache<T>(String key, T Function(dynamic json) decode) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_keyPrefix$key');
    if (raw == null) return null;
    return decode(jsonDecode(raw));
  } catch (_) {
    return null;
  }
}
