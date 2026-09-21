import 'dart:async';

import 'package:flutter/material.dart';

import '../api/pagination.dart';
import '../models.dart';
import '../push/push_service.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);

/// Driver Home Screen tile for available (not-yet-accepted) Dem Légui
/// requests — hidden entirely when there's nothing nearby to accept, a
/// green count badge once some are, plus a local notification the instant a
/// newly-posted one is detected. Mirrors DeliveryAvailableTile (same 20s
/// poll, same seen-ids diffing) and the web driver app's
/// DemLeguiAvailableCard. Unlike deliveries, the backend's available-Dem
/// Légui-requests endpoint 422s while the driver is offline, so polling is
/// gated on [isOnline] — the tile stays hidden while offline too.
///
/// Takes the fetch call as a parameter rather than importing it directly:
/// dem_legui_api.dart lives per-app, so this widget — shared between apps —
/// can't depend on it.
class DemLeguiAvailableTile extends StatefulWidget {
  const DemLeguiAvailableTile({super.key, required this.onTap, required this.fetchAvailable, required this.isOnline});

  final VoidCallback onTap;
  final Future<Paginated<DemLeguiRequest>> Function() fetchAvailable;
  final bool isOnline;

  @override
  State<DemLeguiAvailableTile> createState() => _DemLeguiAvailableTileState();
}

class _DemLeguiAvailableTileState extends State<DemLeguiAvailableTile> {
  int _total = 0;
  Set<int>? _seenIds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load());
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

  Future<void> _load() async {
    if (!widget.isOnline) {
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
