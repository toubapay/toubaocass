import 'client.dart';

/// Matches the RN apps' `ShareableRideKind` — which live, trackable rides
/// support a signed public tracking link + SOS alert.
enum ShareableRideKind {
  trips('trips'),
  anandoRides('anando-rides'),
  demLeguiTrips('dem-legui/trips'),
  deliveries('deliveries');

  final String path;
  const ShareableRideKind(this.path);
}

Future<String> fetchShareLink(ShareableRideKind kind, int id) async {
  final response = await ApiClient.instance.dio.post('/${kind.path}/$id/share-link');
  return (response.data as Map<String, dynamic>)['url'] as String;
}

Future<void> sendSosAlert(ShareableRideKind kind, int id, {double? latitude, double? longitude}) async {
  await ApiClient.instance.dio.post('/${kind.path}/$id/sos', data: {
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
  });
}
