import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/anando_api.dart';
import '../api/client.dart';
import '../models.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);
const _startableStatuses = ['open', 'full'];

/// Quick-start card for the rider's own just-posted Anando ride, shown on
/// Home so starting the trip doesn't require navigating into the Anando hub
/// first. Only ever shows a ride that can actually be started (open/full,
/// not stale) — the moment it's started (or stops existing in that state
/// for any other reason) this disappears on its own.
class MyAnandoRideCard extends StatefulWidget {
  const MyAnandoRideCard({super.key});

  @override
  State<MyAnandoRideCard> createState() => _MyAnandoRideCardState();
}

class _MyAnandoRideCardState extends State<MyAnandoRideCard> {
  AnandoRide? _ride;
  bool _starting = false;
  String? _error;
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
    fetchMyAnandoRides().then((res) {
      if (!mounted) return;
      final active = res.data
          .where((r) => _startableStatuses.contains(r.status) && !isAnandoRideStale(r))
          .toList();
      setState(() => _ride = active.isEmpty ? null : active.first);
    }).catchError((_) {});
  }

  Future<void> _handleStart() async {
    final ride = _ride;
    if (ride == null) return;
    setState(() {
      _starting = true;
      _error = null;
    });
    try {
      await startAnandoRide(ride.id);
      if (mounted) setState(() => _ride = null);
    } catch (e) {
      if (mounted) setState(() => _error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    if (ride == null) return const SizedBox.shrink();

    return InkWell(
      onTap: () => context.push('/anando/${ride.id}'),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.primary, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
                const SizedBox(width: AppSpacing.xs),
                const Text('VOTRE TRAJET ANANDO',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${ride.originCity?.name ?? '?'} → ${ride.destinationCity?.name ?? '?'}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text('${ride.availableSeats} place(s)',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ],
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xs),
                child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12.5)),
              ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _starting ? null : _handleStart,
                child: _starting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Démarrer le trajet'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
