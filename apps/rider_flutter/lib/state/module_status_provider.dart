import 'package:flutter/foundation.dart';

import '../api/modules_api.dart';

/// Feature flags fetched from `GET /modules/status`, mirrors the
/// `ModuleStatusContext` used across the web/RN apps: an unknown/never-fetched
/// key is treated as enabled (fails open) so the UI never blocks on this
/// request failing.
class ModuleStatusProvider extends ChangeNotifier {
  Map<String, bool> _status = {};

  bool isEnabled(String key) => _status[key] ?? true;

  Future<void> load() async {
    try {
      _status = await fetchModuleStatus();
      notifyListeners();
    } catch (_) {
      // Keep failing open; nothing to notify since nothing changed.
    }
  }
}
