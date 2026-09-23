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
  // A message that carries a native `notification` block (e.g. the Dem
  // Légui ETA push — see FcmPushGateway's os_display option) is already
  // auto-displayed by the OS itself while the app is backgrounded/killed,
  // with no app code needed. onBackgroundMessage still fires for it
  // regardless, so showing a second, manually-built notification here
  // would duplicate the OS's own. Only data-only messages (the default
  // for everything else this app sends) need this manual path.
  if (message.notification != null) return;

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

/// Backend sends data-only FCM messages by default (no top-level
/// "notification" key — see FcmPushGateway's own comment) so
/// `message.notification` is usually null and title/body live in
/// `message.data` instead. In the foreground, the OS never auto-displays
/// even an os_display message (see firebaseMessagingBackgroundHandler's own
/// comment on why that path skips this one), so this is still the only
/// place a local Notification ever gets shown while the app is open.
Future<void> _showDataNotification(RemoteMessage message) async {
  final title = message.data['title'];
  if (title == null) return;
  await showLocalNotification(title, message.data['body'], id: _stableNotificationId(message.data));
}

/// A repeating update about the same subject (e.g. one Dem Légui trip's
/// arrival ETA, ticking every minute) should replace its own previous
/// notification rather than stack a fresh one on every tick — mirrors the
/// `tag`/`apns-collapse-id` FcmPushGateway sets server-side for the exact
/// same reason. Keyed on `type` + whichever `*_id` field is present, since
/// every push this backend sends includes one identifying the thing it's
/// about; falls back to null (caller then uses a fresh id per call) for a
/// message with neither.
int? _stableNotificationId(Map<String, dynamic> data) {
  final subjectId = data.entries.firstWhere(
    (entry) => entry.key.endsWith('_id'),
    orElse: () => const MapEntry('', null),
  );
  if (subjectId.value == null) return null;

  return Object.hash(data['type'], subjectId.key, subjectId.value);
}

/// Shows a local notification outside of an actual push arriving — for
/// alerts a screen detects itself while polling (e.g. a newly-available
/// delivery), so it gets the same native sound/vibration as a push instead
/// of only an in-app toast. Reuses the same plugin instance/channel as
/// [_showDataNotification], initializing it first if this is the first
/// notification shown this session. Pass [id] to replace a previously
/// shown notification in place instead of stacking a new one.
Future<void> showLocalNotification(String title, String? body, {int? id}) async {
  if (!_initialized) {
    await _localNotifications.initialize(_notificationInitSettings);
  }
  await _localNotifications.show(
    id ?? Object.hash(title, body, DateTime.now().millisecondsSinceEpoch),
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails('default', 'default', importance: Importance.defaultImportance),
      iOS: DarwinNotificationDetails(),
    ),
  );
}
