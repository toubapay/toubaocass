import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models.dart';
import '../theme.dart';

/// Small, non-interactive route preview for the active-trip card: departure
/// and destination as colored dots on a real map, plus a thin progress rail
/// underneath with a car emoji sliding along it as progress_percent advances
/// for an in-progress trip — or idling with a little bounce while the trip
/// hasn't departed yet. The map itself ignores touches so a tap anywhere on
/// the card (including over the map) still opens the trip, same as the rest
/// of the card.
class MiniRouteMap extends StatefulWidget {
  const MiniRouteMap({super.key, required this.trip});

  final Trip trip;

  @override
  State<MiniRouteMap> createState() => _MiniRouteMapState();
}

class _MiniRouteMapState extends State<MiniRouteMap> with SingleTickerProviderStateMixin {
  late final AnimationController _idleBounce;

  @override
  void initState() {
    super.initState();
    _idleBounce = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _idleBounce.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final origin = widget.trip.originCity;
    final destination = widget.trip.destinationCity;
    if (origin?.latitude == null || origin?.longitude == null || destination?.latitude == null || destination?.longitude == null) {
      return const SizedBox.shrink();
    }

    final originPos = LatLng(origin!.latitude!, origin.longitude!);
    final destPos = LatLng(destination!.latitude!, destination.longitude!);
    final midLat = (originPos.latitude + destPos.latitude) / 2;
    final midLng = (originPos.longitude + destPos.longitude) / 2;

    final inProgress = widget.trip.status == 'in_progress';
    final progress = inProgress ? ((widget.trip.progressPercent ?? 0) / 100).clamp(0.0, 1.0).toDouble() : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: SizedBox(
            height: 110,
            child: IgnorePointer(
              child: GoogleMap(
                initialCameraPosition: CameraPosition(target: LatLng(midLat, midLng), zoom: 6),
                polylines: {
                  Polyline(
                    polylineId: const PolylineId('mini-route'),
                    points: [originPos, destPos],
                    color: AppColors.primary,
                    width: 3,
                    patterns: [PatternItem.dash(8), PatternItem.gap(8)],
                  ),
                },
                markers: {
                  Marker(
                    markerId: const MarkerId('origin'),
                    position: originPos,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
                  ),
                  Marker(
                    markerId: const MarkerId('destination'),
                    position: destPos,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                  ),
                },
                zoomGesturesEnabled: false,
                scrollGesturesEnabled: false,
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                zoomControlsEnabled: false,
                myLocationButtonEnabled: false,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 22,
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              Container(height: 2, margin: const EdgeInsets.symmetric(horizontal: 10), color: AppColors.border),
              AnimatedBuilder(
                animation: _idleBounce,
                builder: (context, _) {
                  final bounceDy = inProgress ? 0.0 : -3 * _idleBounce.value;
                  return AnimatedAlign(
                    duration: const Duration(milliseconds: 900),
                    curve: Curves.linear,
                    alignment: Alignment(progress * 2 - 1, 0),
                    child: Transform.translate(
                      offset: Offset(0, bounceDy),
                      child: const Text('🚗', style: TextStyle(fontSize: 18)),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
