import 'dart:io';

import 'package:url_launcher/url_launcher.dart';

String buildGoogleMapsNavigationUrl(double latitude, double longitude) {
  return 'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude&travelmode=driving&dir_action=navigate';
}

Future<void> openNavigation(double latitude, double longitude) async {
  if (Platform.isAndroid) {
    final androidNavUri = Uri.parse('google.navigation:q=$latitude,$longitude&mode=d');
    try {
      if (await canLaunchUrl(androidNavUri)) {
        await launchUrl(androidNavUri);
        return;
      }
    } catch (_) {
      // Fall through to the universal web URL below.
    }
  }
  await launchUrl(Uri.parse(buildGoogleMapsNavigationUrl(latitude, longitude)), mode: LaunchMode.externalApplication);
}
