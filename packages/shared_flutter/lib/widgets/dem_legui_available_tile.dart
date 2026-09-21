import 'dart:async';

import 'package:flutter/material.dart';

import '../api/pagination.dart';
import '../models.dart';
import '../push/push_service.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);

/// Driver Home Screen tile for Dem Légui: while the driver has no active
/// trip, mirrors DeliveryAvailableTile (hidden with nothing nearby, a green
/// count badge once some are, a local notification on a newly-posted one).
/// A driver is limited to one active (open or in_progress) Dem Légui trip
/// at a time — the backend rejects accepting a new one otherwise — so once
/// they have one, this tile switches to showing it instead of a browse
/// action that would just fail. The available-requests endpoint 422s while
/// offline, so that half of the polling is gated on [isOnline]; the active
/// trip poll isn't, since a driver mid-trip shouldn't lose it just because
/// they went offline.
///
/// Takes both fetch calls as parameters rather than importing them
/// directly: dem_legui_api.dart lives per-app, so this widget — shared
/// between apps — can't depend on it.
class DemLeguiAvailableTile extends StatefulWidget {
  const DemLeguiAvailableTile({
    super.key,
    required this.onTap,
    required this.onOpenTrip,
    required this.fetchAvailable,
    required this.fetchMyTrips,
    required this.isOnline,
  });

  final VoidCallback onTap;
  final void Function(int tripId) onOpenTrip;
  final Future<Paginated<DemLeguiRequest>> Function() fetchAvailable;
  final Future<Paginated<DemLeguiTrip>> Function() fetchMyTrips;
  final bool isOnline;

  @override
  State<DemLeguiAvailableTile> createState() => _DemLeguiAvailableTileState();
}

const _activeTripStatuses = {'open', 'in_progress'};

class _DemLeguiAvailableTileState extends State<DemLeguiAvailableTile> {
  int _total = 0;
  DemLeguiTrip? _activeTrip;
  Set<int>? _seenIds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadActiveTrip();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) {
      _loadActiveTrip();
      _load();
    });
  }

  @override
  void didUpdateWidget(DemLeguiAvailableTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isOnline != oldWidget.isOnline) _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadActiveTrip() async {
    try {
      final result = await widget.fetchMyTrips();
      if (!mounted) return;
      final matches = result.data.where((t) => _activeTripStatuses.contains(t.status));
      setState(() => _activeTrip = matches.isEmpty ? null : matches.first);
    } catch (_) {
      // Best-effort — keep the last known trip on a transient poll failure.
    }
  }

  Future<void> _load() async {
    if (!widget.isOnline || _activeTrip != null) {
      if (mounted) setState(() => _total = 0);
      return;
    }
    try {
      final result = await widget.fetchAvailable();
      if (!mounted) return;
      setState(() => _total = result.total);

      final ids = result.data.map((r) => r.id).toSet();
      if (_seenIds == null) {
        // First fetch just seeds the seen set — nothing to alert about yet.
        _seenIds = ids;
        return;
      }
      final fresh = ids.difference(_seenIds!);
      if (fresh.isEmpty) return;
      _seenIds!.addAll(fresh);
      showLocalNotification('🚕 Nouvelle demande Dem Légui', 'Appuyez pour voir et accepter');
    } catch (_) {
      // Best-effort — keep the last known count on a transient poll failure.
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeTrip = _activeTrip;
    if (activeTrip != null) {
      final inProgress = activeTrip.status == 'in_progress';
      return InkWell(
        onTap: () => widget.onOpenTrip(activeTrip.id),
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.primary),
          ),
          child: Row(
            children: [
              const Text('🚕', style: TextStyle(fontSize: 24)),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Vers ${activeTrip.destinationCity?.name ?? '?'}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    Text(
                      inProgress ? 'Trajet en cours — appuyez pour suivre' : 'Trajet accepté — appuyez pour gérer',
                      style: const TextStyle(fontSize: 14, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_total == 0) return const SizedBox.shrink();

    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.success,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.success),
        ),
        child: Row(
          children: [
            const Text('🚕', style: TextStyle(fontSize: 24)),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$_total demande(s) Dem Légui disponible(s)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  const Text(
                    'Appuyez pour voir et accepter',
                    style: TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                ],
              ),
            ),
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Text(
                '$_total',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.success),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
