import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/auth_api.dart' as auth_api;

final _localNotifications = FlutterLocalNotificationsPlugin();
bool _initialized = false;

/// Requests notification permission, registers the device's FCM token with
/// the backend (same `/fcm-token` endpoint used by the other clients), and
/// shows a local notification for messages that arrive while the app is in
/// the foreground. Best-effort: silently no-ops if Firebase hasn't been
/// configured yet (no google-services.json / GoogleService-Info.plist) or on
/// platforms/emulators without push support.
Future<void> registerPushToken() async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }

    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus != AuthorizationStatus.authorized &&
        settings.authorizationStatus != AuthorizationStatus.provisional) {
      return;
    }

    if (!_initialized) {
      await _localNotifications.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      FirebaseMessaging.onMessage.listen(_showForegroundNotification);
      _initialized = true;
    }

    final token = await messaging.getToken();
    if (token != null) {
      await auth_api.registerPushToken(token);
    }
  } catch (error) {
    debugPrint('Push registration skipped: $error');
  }
}

void _showForegroundNotification(RemoteMessage message) {
  final notification = message.notification;
  if (notification == null) return;
  _localNotifications.show(
    notification.hashCode,
    notification.title,
    notification.body,
    const NotificationDetails(
      android: AndroidNotificationDetails('default', 'default', importance: Importance.defaultImportance),
      iOS: DarwinNotificationDetails(),
    ),
  );
}
