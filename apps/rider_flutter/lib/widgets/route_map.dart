import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models.dart';
import '../theme.dart';

/// City-to-city route visualization for the trip detail screen: origin and
/// destination markers connected by a straight line — a simple visual of the
/// journey, not a turn-by-turn route.
class RouteMap extends StatelessWidget {
  const RouteMap({super.key, required this.trip});

  final Trip trip;

  @override
  Widget build(BuildContext context) {
    final origin = trip.originCity;
    final destination = trip.destinationCity;
    if (origin?.latitude == null || origin?.longitude == null || destination?.latitude == null || destination?.longitude == null) {
      return const SizedBox.shrink();
    }

    final originPos = LatLng(origin!.latitude!, origin.longitude!);
    final destPos = LatLng(destination!.latitude!, destination.longitude!);
    final bounds = LatLngBounds(
      southwest: LatLng(
        originPos.latitude < destPos.latitude ? originPos.latitude : destPos.latitude,
        originPos.longitude < destPos.longitude ? originPos.longitude : destPos.longitude,
      ),
      northeast: LatLng(
        originPos.latitude > destPos.latitude ? originPos.latitude : destPos.latitude,
        originPos.longitude > destPos.longitude ? originPos.longitude : destPos.longitude,
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: SizedBox(
        height: 180,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(
            target: LatLng((originPos.latitude + destPos.latitude) / 2, (originPos.longitude + destPos.longitude) / 2),
            zoom: 6,
          ),
          onMapCreated: (controller) {
            Future.delayed(const Duration(milliseconds: 300), () {
              controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 40));
            });
          },
          polylines: {
            Polyline(
              polylineId: const PolylineId('route'),
              points: [originPos, destPos],
              color: AppColors.primary,
              width: 3,
              patterns: [PatternItem.dash(12), PatternItem.gap(8)],
            ),
          },
          markers: {
            Marker(markerId: const MarkerId('origin'), position: originPos, infoWindow: InfoWindow(title: origin.name)),
            Marker(markerId: const MarkerId('destination'), position: destPos, infoWindow: InfoWindow(title: destination.name)),
          },
          scrollGesturesEnabled: false,
          zoomGesturesEnabled: false,
          rotateGesturesEnabled: false,
          myLocationButtonEnabled: false,
        ),
      ),
    );
  }
}
