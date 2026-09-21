import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';

import '../theme.dart';

/// Live-position preview map: a marker for the current position, plus an
/// optional destination marker and a dashed line between them. Mirrors the
/// web apps' AnandoLiveMap, used both for an in-progress Anando ride and for
/// a Dem Légui driver's position — position comes from polling the
/// containing screen re-fetches, not a socket, so the camera pans to the
/// new position on update rather than animating a continuous track.
class LiveMap extends StatefulWidget {
  const LiveMap({
    super.key,
    required this.currentLatitude,
    required this.currentLongitude,
    this.destinationLatitude,
    this.destinationLongitude,
    this.destinationName,
    this.updatedAt,
  });

  final double currentLatitude;
  final double currentLongitude;
  final double? destinationLatitude;
  final double? destinationLongitude;
  final String? destinationName;

  /// ISO-8601 timestamp string, shown as an "updated at HH:mm" badge.
  final String? updatedAt;

  @override
  State<LiveMap> createState() => _LiveMapState();
}

class _LiveMapState extends State<LiveMap> {
  GoogleMapController? _controller;

  LatLng get _currentPos => LatLng(widget.currentLatitude, widget.currentLongitude);

  @override
  void didUpdateWidget(covariant LiveMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentLatitude != widget.currentLatitude || oldWidget.currentLongitude != widget.currentLongitude) {
      _controller?.animateCamera(CameraUpdate.newLatLng(_currentPos));
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasDestination = widget.destinationLatitude != null && widget.destinationLongitude != null;
    final destPos = hasDestination ? LatLng(widget.destinationLatitude!, widget.destinationLongitude!) : null;

    final updatedAt = widget.updatedAt;
    final badgeText = updatedAt != null ? 'Mis à jour à ${DateFormat('HH:mm').format(DateTime.parse(updatedAt).toLocal())}' : null;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: SizedBox(
        height: 200,
        child: Stack(
          children: [
            GoogleMap(
              initialCameraPosition: CameraPosition(target: _currentPos, zoom: 13),
              onMapCreated: (controller) => _controller = controller,
              polylines: destPos == null
                  ? const {}
                  : {
                      Polyline(
                        polylineId: const PolylineId('live-route'),
                        points: [_currentPos, destPos],
                        color: AppColors.primary,
                        width: 3,
                        patterns: [PatternItem.dash(12), PatternItem.gap(8)],
                      ),
                    },
              markers: {
                Marker(
                  markerId: const MarkerId('current'),
                  position: _currentPos,
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                ),
                if (destPos != null)
                  Marker(
                    markerId: const MarkerId('destination'),
                    position: destPos,
                    infoWindow: InfoWindow(title: widget.destinationName),
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
                  ),
              },
              myLocationButtonEnabled: false,
            ),
            if (badgeText != null)
              Positioned(
                left: 8,
                bottom: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(badgeText, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
