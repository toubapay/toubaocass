import 'package:geolocator/geolocator.dart';

class Coordinates {
  final double latitude;
  final double longitude;
  Coordinates({required this.latitude, required this.longitude});
}

class LocationRequestException implements Exception {
  final String message;
  LocationRequestException(this.message);
}

/// Requests device location permission and fetches a single current-position
/// fix on demand — used to search for trips departing near the rider now.
Future<Coordinates> requestMyLocation() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw LocationRequestException('Le service de localisation est désactivé.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
    throw LocationRequestException("L'autorisation de localisation a été refusée.");
  }

  try {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
    );
    return Coordinates(latitude: position.latitude, longitude: position.longitude);
  } catch (_) {
    throw LocationRequestException('Impossible d\'obtenir votre position. Vérifiez les paramètres de votre appareil.');
  }
}
