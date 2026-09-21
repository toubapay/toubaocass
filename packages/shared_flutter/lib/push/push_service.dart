import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/auth_api.dart' as auth_api;

final _localNotifications = FlutterLocalNotificationsPlugin();
bool _initialized = false;

const _notificationInitSettings = InitializationSettings(
  android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  iOS: DarwinInitializationSettings(),
);

/// Runs in a separate background isolate when a push arrives while the app
/// is backgrounded or terminated. Must be a top-level function (not a
/// method or closure) so the engine can invoke it outside the normal app
/// lifecycle — registered by [initializePushBackgroundHandler].
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp();
  }
  // Fresh isolate — the foreground listener's `_initialized` flag doesn't
  // carry over here, so the plugin needs its own init on every invocation.
  await _localNotifications.initialize(_notificationInitSettings);
  await _showDataNotification(message);
}

/// Call once from main(), before runApp(), so pushes that arrive while the
/// app is backgrounded or fully terminated still show a notification —
/// without this, a data-only FCM message (see FcmPushGateway's own comment
/// on why the backend sends those instead of a "notification" payload) is
/// otherwise never displayed outside the foreground. Best-effort: silently
/// no-ops if Firebase hasn't been configured yet.
Future<void> initializePushBackgroundHandler() async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (error) {
    debugPrint('Push background handler not registered: $error');
  }
}

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
      await _localNotifications.initialize(_notificationInitSettings);
      FirebaseMessaging.onMessage.listen(_showDataNotification);
      // The token can rotate (reinstall, OS-level refresh) independently of
      // this method ever being called again — keep the backend's copy
      // current so pushes don't silently stop working after a rotation.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        auth_api.registerPushToken(newToken).catchError((_) {});
      });
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

/// Backend sends data-only FCM messages (no top-level "notification" key,
/// on purpose — see FcmPushGateway's own comment) so `message.notification`
/// is always null; title/body live in `message.data` instead. This is the
/// only place a local Notification ever gets shown, foreground or
/// background alike, mirroring the web apps' single-display-path fix.
Future<void> _showDataNotification(RemoteMessage message) async {
  final title = message.data['title'];
  if (title == null) return;
  await _localNotifications.show(
    message.hashCode,
    title,
    message.data['body'],
    const NotificationDetails(
      android: AndroidNotificationDetails('default', 'default', importance: Importance.defaultImportance),
      iOS: DarwinNotificationDetails(),
    ),
  );
}
