import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/dem_legui_api.dart';
import '../models.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 8);

/// Persistent top-right badge, shown right below the nav bar on Home
/// whenever the rider has an active Dem Légui request: "waiting for a
/// driver" while pending, then once matched — "driver arriving" (+ ETA once
/// known), "driver arrived" once they've checked in at the pickup point,
/// and "trip in progress" once the driver starts driving. Always links
/// through to the same request detail screen. Disappears on its own once
/// the trip completes/cancels (backend filters those out of the "active"
/// lookup).
class DemLeguiStatusWidget extends StatefulWidget {
  const DemLeguiStatusWidget({super.key});

  @override
  State<DemLeguiStatusWidget> createState() => _DemLeguiStatusWidgetState();
}

class _DemLeguiStatusWidgetState extends State<DemLeguiStatusWidget> {
  DemLeguiRequest? _active;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _load() {
    fetchMyActiveDemLeguiRequest().then((request) {
      if (mounted) setState(() => _active = request);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final active = _active;
    if (active == null) return const SizedBox.shrink();

    final isMatched = active.status == 'matched';
    final String label;
    if (!isMatched) {
      label = 'Recherche d\'un chauffeur…';
    } else if (active.tripStatus == 'in_progress') {
      label = 'Trajet en cours';
    } else if (active.tripArrivedAt != null) {
      label = 'Le chauffeur est arrivé';
    } else if (active.etaMinutes != null) {
      label = 'Chauffeur en route · ${active.etaMinutes} min';
    } else {
      label = 'Chauffeur en route';
    }

    return Align(
      alignment: Alignment.centerRight,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => context.push('/dem-legui/requests/${active.id}'),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.text)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
