import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../api/anando_api.dart';
import '../models.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);
const _visibleDuration = Duration(seconds: 4);

/// Small green banner overlaid at the top of Home, one per newly-posted
/// Anando ride — polling (no WebSocket infra in this backend), mirroring
/// rider-web's AnandoAvailableToast. The first fetch only seeds "already
/// seen" ride ids silently so existing rides don't all pop up at once on
/// screen load; only rides discovered on later polls queue a toast.
class AnandoAvailableToast extends StatefulWidget {
  const AnandoAvailableToast({super.key});

  @override
  State<AnandoAvailableToast> createState() => _AnandoAvailableToastState();
}

class _AnandoAvailableToastState extends State<AnandoAvailableToast> {
  final List<AnandoRide> _queue = [];
  AnandoRide? _current;
  Set<int>? _seenIds;
  Timer? _pollTimer;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _load());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _hideTimer?.cancel();
    super.dispose();
  }

  void _load() {
    fetchAnandoRides().then((res) {
      if (!mounted) return;
      final rides = res.data;

      if (_seenIds == null) {
        setState(() => _seenIds = rides.map((r) => r.id).toSet());
        return;
      }

      final fresh = rides.where((r) => !_seenIds!.contains(r.id)).toList();
      if (fresh.isEmpty) return;

      setState(() {
        _seenIds!.addAll(fresh.map((r) => r.id));
        _queue.addAll(fresh);
      });
      HapticFeedback.lightImpact();
      _maybeShowNext();
    }).catchError((_) {});
  }

  void _maybeShowNext() {
    if (_current != null || _queue.isEmpty) return;
    final next = _queue.removeAt(0);
    setState(() => _current = next);
    _hideTimer = Timer(_visibleDuration, () {
      if (!mounted) return;
      setState(() => _current = null);
      _maybeShowNext();
    });
  }

  @override
  Widget build(BuildContext context) {
    final current = _current;
    if (current == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: () {
          _hideTimer?.cancel();
          setState(() => _current = null);
          context.push('/anando/${current.id}');
          _maybeShowNext();
        },
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.successSoft,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Nouveau trajet Anando : ${current.originCity?.name ?? ''} → ${current.destinationCity?.name ?? ''}',
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.success),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const Text('Voir', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.success)),
            ],
          ),
        ),
      ),
    );
  }
}
