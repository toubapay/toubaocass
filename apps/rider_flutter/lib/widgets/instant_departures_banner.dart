import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/trips_api.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);

/// Always-visible Home-screen badge for "instant post" style departures
/// (drivers leaving right away, no scheduled date/time). Polls since this
/// app has no push-event stream to jump on.
class InstantDeparturesBanner extends StatefulWidget {
  const InstantDeparturesBanner({super.key});

  @override
  State<InstantDeparturesBanner> createState() => _InstantDeparturesBannerState();
}

class _InstantDeparturesBannerState extends State<InstantDeparturesBanner> {
  int _count = 0;
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
    fetchInstantTrips().then((trips) {
      if (mounted) setState(() => _count = trips.length);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    if (_count == 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: () => context.push('/instant'),
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.dangerSoft,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$_count départ(s) immédiat(s) disponible(s)',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.danger)),
              const Text('Voir', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.danger)),
            ],
          ),
        ),
      ),
    );
  }
}
