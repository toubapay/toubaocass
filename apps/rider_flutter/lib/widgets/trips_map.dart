import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models.dart';
import '../theme.dart';

class TripsMap extends StatelessWidget {
  const TripsMap({super.key, required this.trips, required this.onSelectTrip});

  final List<Trip> trips;
  final void Function(int tripId) onSelectTrip;

  @override
  Widget build(BuildContext context) {
    final withLocation = trips.where((t) => t.departureLatitude != null && t.departureLongitude != null).toList();
    if (withLocation.isEmpty) return const SizedBox.shrink();

    final markers = withLocation
        .map((t) => Marker(
              markerId: MarkerId('trip-${t.id}'),
              position: LatLng(t.departureLatitude!, t.departureLongitude!),
              infoWindow: InfoWindow(
                title: '${t.originCity?.name ?? '?'} → ${t.destinationCity?.name ?? '?'}',
                snippet: '${t.departureDate} à ${t.departureTime}',
                onTap: () => onSelectTrip(t.id),
              ),
            ))
        .toSet();

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: SizedBox(
        height: 260,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: markers.first.position, zoom: 8),
          markers: markers,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
        ),
      ),
    );
  }
}
