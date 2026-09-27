import 'dart:async';

import 'package:flutter/material.dart';

import '../api/trips_api.dart';
import '../models.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 15);

/// Persistent top-right badge, shown right below the Home app bar whenever
/// the rider has a regular Trip currently in progress (a carpool they
/// booked a seat on, now under way). Tapping it opens the trip detail
/// screen, which renders the live map, progress bar, elapsed time, and
/// distance covered. Disappears on its own once the trip completes
/// (backend filters completed trips out of the "active" lookup).
class MyTripStatusWidget extends StatefulWidget {
  const MyTripStatusWidget({super.key, required this.onTap});

  final void Function(int tripId) onTap;

  @override
  State<MyTripStatusWidget> createState() => _MyTripStatusWidgetState();
}

class _MyTripStatusWidgetState extends State<MyTripStatusWidget> {
  Trip? _active;
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
    fetchMyActiveTrip().then((trip) {
      if (mounted) setState(() => _active = trip);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final active = _active;
    if (active == null) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.centerRight,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => widget.onTap(active.id),
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
                const Text('🚗 Trajet en cours', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.text)),
                if (active.progressPercent != null) ...[
                  const SizedBox(width: AppSpacing.xs),
                  Text('${active.progressPercent}%',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
