import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../theme.dart';
import '../utils/my_location.dart';

const _defaultCenter = LatLng(14.6928, -17.4467); // Dakar city center

/// Departure-point picker: tap the map to drop a pin, drag it to adjust, or
/// snap it to the driver's current GPS position. Simpler than the RN app's
/// version (no address-search autocomplete), but covers the same core need —
/// setting the exact pickup point passengers see on the trip detail map.
class DeparturePicker extends StatefulWidget {
  const DeparturePicker({super.key, required this.latitude, required this.longitude, required this.onChange});

  final double? latitude;
  final double? longitude;
  final void Function(double latitude, double longitude) onChange;

  @override
  State<DeparturePicker> createState() => _DeparturePickerState();
}

class _DeparturePickerState extends State<DeparturePicker> {
  bool locating = false;
  String? error;

  Future<void> _useCurrentLocation() async {
    setState(() {
      locating = true;
      error = null;
    });
    try {
      final coords = await requestMyLocation();
      widget.onChange(coords.latitude, coords.longitude);
    } on LocationRequestException catch (e) {
      setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPin = widget.latitude != null && widget.longitude != null;
    final center = hasPin ? LatLng(widget.latitude!, widget.longitude!) : _defaultCenter;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: SizedBox(
            height: 200,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: 13),
              onTap: (position) => widget.onChange(position.latitude, position.longitude),
              markers: hasPin
                  ? {
                      Marker(
                        markerId: const MarkerId('departure'),
                        position: center,
                        draggable: true,
                        onDragEnd: (position) => widget.onChange(position.latitude, position.longitude),
                      ),
                    }
                  : {},
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        OutlinedButton(
          onPressed: locating ? null : _useCurrentLocation,
          child: locating
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('📍 Utiliser ma position actuelle'),
        ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.xs),
            child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
          ),
        if (!hasPin)
          const Padding(
            padding: EdgeInsets.only(top: AppSpacing.xs),
            child: Text(
              'Touchez la carte pour placer un repère à l\'endroit où les passagers doivent vous retrouver.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
      ],
    );
  }
}
