import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:shared_flutter/widgets/driver_tier_badge.dart';
import 'package:shared_flutter/widgets/navigate_fab.dart';

import '../models.dart';
import '../theme.dart';

/// Full-screen, Uber-style tracking view for the window between "driver
/// accepted my Dem Légui request" and "trip started" — i.e. trip.status ==
/// 'open'. Replaces the whole screen chrome with a full-bleed map + bottom
/// sheet, mirroring rider-web's DemLeguiEnRouteTracker. Not reused for the
/// later "in_progress" state — DemLeguiRequestDetailScreen's embedded
/// LiveMap already covers that adequately.
class DemLeguiEnRouteTracker extends StatefulWidget {
  const DemLeguiEnRouteTracker({
    super.key,
    required this.request,
    required this.trip,
    required this.onChat,
    required this.onCancel,
    required this.cancelling,
  });

  final DemLeguiRequest request;
  final DemLeguiTrip trip;
  final VoidCallback onChat;
  final VoidCallback onCancel;
  final bool cancelling;

  @override
  State<DemLeguiEnRouteTracker> createState() => _DemLeguiEnRouteTrackerState();
}

class _DemLeguiEnRouteTrackerState extends State<DemLeguiEnRouteTracker> {
  bool _detailsOpen = false;
  GoogleMapController? _mapController;

  @override
  void didUpdateWidget(covariant DemLeguiEnRouteTracker oldWidget) {
    super.didUpdateWidget(oldWidget);
    final driverPos = _driverPos;
    if (driverPos != null &&
        (oldWidget.trip.driver.currentLatitude !=
                widget.trip.driver.currentLatitude ||
            oldWidget.trip.driver.currentLongitude !=
                widget.trip.driver.currentLongitude)) {
      _mapController?.animateCamera(CameraUpdate.newLatLng(driverPos));
    }
  }

  LatLng? get _driverPos {
    final lat = widget.trip.driver.currentLatitude;
    final lng = widget.trip.driver.currentLongitude;
    return lat == null || lng == null ? null : LatLng(lat, lng);
  }

  LatLng get _pickupPos =>
      LatLng(widget.request.pickupLatitude, widget.request.pickupLongitude);

  @override
  Widget build(BuildContext context) {
    final r = widget.request;
    final t = widget.trip;
    final driverPos = _driverPos;
    final hasArrived = t.arrivedAt != null;

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: driverPos == null
                ? const ColoredBox(
                    color: AppColors.surface,
                    child: Center(
                      child: Text(
                        'En attente de la position du chauffeur…',
                        style: TextStyle(
                          fontSize: 13.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  )
                : GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: driverPos,
                      zoom: 14,
                    ),
                    onMapCreated: (controller) => _mapController = controller,
                    myLocationButtonEnabled: false,
                    polylines: {
                      Polyline(
                        polylineId: const PolylineId('en-route'),
                        points: [driverPos, _pickupPos],
                        color: AppColors.primary,
                        width: 4,
                        patterns: [PatternItem.dash(16), PatternItem.gap(10)],
                      ),
                    },
                    markers: {
                      Marker(
                        markerId: const MarkerId('driver'),
                        position: driverPos,
                        icon: BitmapDescriptor.defaultMarkerWithHue(
                          BitmapDescriptor.hueAzure,
                        ),
                      ),
                      Marker(
                        markerId: const MarkerId('pickup'),
                        position: _pickupPos,
                        icon: BitmapDescriptor.defaultMarkerWithHue(
                          BitmapDescriptor.hueOrange,
                        ),
                      ),
                    },
                  ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + AppSpacing.md,
            left: AppSpacing.md,
            child: _RoundIconButton(
              icon: Icons.arrow_back,
              onTap: () => Navigator.of(context).pop(),
            ),
          ),
          NavigateFab(
            latitude: _pickupPos.latitude,
            longitude: _pickupPos.longitude,
            label: 'Naviguer vers le point de ramassage',
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.55,
              ),
              padding: EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.lg + MediaQuery.of(context).padding.bottom,
              ),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(
                  top: Radius.circular(AppRadius.lg),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x29131A17),
                    blurRadius: 24,
                    offset: Offset(0, -8),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () => setState(() => _detailsOpen = !_detailsOpen),
                      child: Row(
                        children: [
                          Text(
                            hasArrived
                                ? '🚩 Le chauffeur est arrivé'
                                : (r.etaMinutes != null
                                      ? 'Arrivée dans ${r.etaMinutes} min'
                                      : 'Chauffeur en route'),
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(width: 6),
                          AnimatedRotation(
                            turns: _detailsOpen ? 0.25 : 0,
                            duration: const Duration(milliseconds: 150),
                            child: const Icon(
                              Icons.chevron_right,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_detailsOpen)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: AppSpacing.md),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'RAMASSAGE',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: AppSpacing.sm,
                              ),
                              child: Text(
                                r.pickupAddress ?? '',
                                style: const TextStyle(fontSize: 14),
                              ),
                            ),
                            const Text(
                              'TARIF',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted,
                              ),
                            ),
                            Text(
                              '${r.fareTotal} FCFA',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppColors.accentSoft,
                          backgroundImage: t.driver.photoUrl != null
                              ? NetworkImage(t.driver.photoUrl!)
                              : null,
                          child: t.driver.photoUrl == null
                              ? Text(
                                  (t.driver.name ?? '?').trim().isEmpty
                                      ? '?'
                                      : t.driver.name!.trim()[0].toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      t.driver.name ?? 'Chauffeur',
                                      style: const TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w700,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '★${t.driver.rating.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                              if (t.car != null)
                                Text(
                                  '${t.car!.color != null ? '${t.car!.color} ' : ''}${t.car!.make} ${t.car!.model}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        DriverTierBadge(tier: t.driver.tier),
                      ],
                    ),
                    if (t.car != null)
                      Container(
                        margin: const EdgeInsets.only(top: AppSpacing.sm),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.text, width: 1.5),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Text(
                          t.car!.plateNumber,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                            ),
                            onPressed: () =>
                                launchUrl(Uri.parse('tel:${t.driver.phone}')),
                            child: const Text('📞 Appeler'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: widget.onChat,
                            child: const Text('💬 Discuter'),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.sm),
                      child: SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: widget.cancelling ? null : widget.onCancel,
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.danger,
                          ),
                          child: widget.cancelling
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Annuler la demande'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      elevation: 3,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, size: 20, color: AppColors.text),
        ),
      ),
    );
  }
}
