import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../api/client.dart';
import '../theme.dart';
import '../utils/my_location.dart';

const _defaultCenter = LatLng(14.6928, -17.4467); // Dakar city center

class _Prediction {
  final String placeId;
  final String description;
  _Prediction({required this.placeId, required this.description});
}

/// Saved-address picker: type to get Google Places suggestions, tap or drag
/// the marker to fine-tune, or snap it to the user's current GPS position.
/// Mirrors DeparturePicker's map layout (built for driver trip-posting), plus
/// Places Autocomplete/Details/Geocoding, which that simpler component
/// doesn't have.
class AddressMapPicker extends StatefulWidget {
  const AddressMapPicker({
    super.key,
    required this.addressLine,
    required this.onAddressLineChanged,
    required this.latitude,
    required this.longitude,
    required this.onLocationChanged,
  });

  final String addressLine;
  final void Function(String) onAddressLineChanged;
  final double? latitude;
  final double? longitude;
  final void Function(double latitude, double longitude) onLocationChanged;

  @override
  State<AddressMapPicker> createState() => _AddressMapPickerState();
}

class _AddressMapPickerState extends State<AddressMapPicker> {
  final _dio = Dio();
  final _controller = TextEditingController();
  Timer? _debounce;
  List<_Prediction> _predictions = [];
  bool _searching = false;
  bool _locating = false;
  String? _locationError;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.addressLine;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    widget.onAddressLineChanged(value);
    _debounce?.cancel();
    if (googleMapsApiKey.isEmpty || value.trim().length < 3) {
      setState(() => _predictions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      setState(() => _searching = true);
      try {
        final response = await _dio.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', queryParameters: {
          'input': value,
          'components': 'country:sn',
          'language': 'fr',
          'key': googleMapsApiKey,
        });
        final items = (response.data['predictions'] as List? ?? []);
        setState(() {
          _predictions = items
              .map((p) => _Prediction(placeId: p['place_id'] as String, description: p['description'] as String))
              .toList();
        });
      } catch (_) {
        setState(() => _predictions = []);
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _selectPrediction(_Prediction prediction) async {
    _controller.text = prediction.description;
    widget.onAddressLineChanged(prediction.description);
    setState(() => _predictions = []);
    try {
      final response = await _dio.get('https://maps.googleapis.com/maps/api/place/details/json', queryParameters: {
        'place_id': prediction.placeId,
        'fields': 'geometry,formatted_address',
        'key': googleMapsApiKey,
      });
      final location = response.data['result']?['geometry']?['location'];
      if (location != null) {
        widget.onLocationChanged((location['lat'] as num).toDouble(), (location['lng'] as num).toDouble());
        final formatted = response.data['result']?['formatted_address'] as String?;
        if (formatted != null) {
          _controller.text = formatted;
          widget.onAddressLineChanged(formatted);
        }
      }
    } catch (_) {
      // Keep the typed description even if Place Details fails.
    }
  }

  Future<void> _reverseGeocode(double latitude, double longitude) async {
    if (googleMapsApiKey.isEmpty) return;
    try {
      final response = await _dio.get('https://maps.googleapis.com/maps/api/geocode/json', queryParameters: {
        'latlng': '$latitude,$longitude',
        'language': 'fr',
        'key': googleMapsApiKey,
      });
      final results = response.data['results'] as List?;
      final formatted = (results != null && results.isNotEmpty) ? results.first['formatted_address'] as String? : null;
      if (formatted != null) {
        _controller.text = formatted;
        widget.onAddressLineChanged(formatted);
      }
    } catch (_) {
      // Non-fatal — the pin still moves even if we can't resolve a label.
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final coords = await requestMyLocation();
      widget.onLocationChanged(coords.latitude, coords.longitude);
      await _reverseGeocode(coords.latitude, coords.longitude);
    } on LocationRequestException catch (e) {
      setState(() => _locationError = e.message);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPin = widget.latitude != null && widget.longitude != null;
    final center = hasPin ? LatLng(widget.latitude!, widget.longitude!) : _defaultCenter;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: 'Sacré-Cœur 3, Dakar',
                suffixIcon: _searching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                      )
                    : null,
              ),
              onChanged: _onQueryChanged,
            ),
            if (_predictions.isNotEmpty)
              Positioned(
                top: 56,
                left: 0,
                right: 0,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 220),
                    child: ListView.separated(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      itemCount: _predictions.length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final prediction = _predictions[index];
                        return ListTile(
                          dense: true,
                          title: Text(prediction.description, style: const TextStyle(fontSize: 14)),
                          onTap: () => _selectPrediction(prediction),
                        );
                      },
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        if (googleMapsApiKey.isNotEmpty)
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: SizedBox(
              height: 200,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(target: center, zoom: 13),
                onTap: (position) {
                  widget.onLocationChanged(position.latitude, position.longitude);
                  _reverseGeocode(position.latitude, position.longitude);
                },
                markers: hasPin
                    ? {
                        Marker(
                          markerId: const MarkerId('address'),
                          position: center,
                          draggable: true,
                          onDragEnd: (position) {
                            widget.onLocationChanged(position.latitude, position.longitude);
                            _reverseGeocode(position.latitude, position.longitude);
                          },
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
          onPressed: _locating ? null : _useCurrentLocation,
          child: _locating
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('📍 Utiliser ma position actuelle'),
        ),
        if (_locationError != null)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.xs),
            child: Text(_locationError!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
          ),
        if (googleMapsApiKey.isNotEmpty && !hasPin)
          const Padding(
            padding: EdgeInsets.only(top: AppSpacing.xs),
            child: Text(
              "Touchez la carte pour ajuster l'emplacement exact.",
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
      ],
    );
  }
}
