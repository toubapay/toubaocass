import 'dart:async';

import 'package:flutter/material.dart';

import '../api/pagination.dart';
import '../models.dart';
import '../push/push_service.dart';
import '../theme.dart';

const _pollInterval = Duration(seconds: 20);

/// Driver Home Screen tile for available (not-yet-accepted) deliveries — a
/// plain "browse deliveries" tile when none are available, switching to a
/// green count badge once some are, plus a local notification the instant a
/// newly-posted one is detected. Mirrors the web driver app's
/// DeliveryAvailableCard (same 20s poll, same seen-ids diffing).
///
/// Takes the fetch call as a parameter rather than importing it directly:
/// deliveries_api.dart lives per-app (its endpoints differ from the rider
/// side), so this widget — shared between apps — can't depend on it.
class DeliveryAvailableTile extends StatefulWidget {
  const DeliveryAvailableTile({super.key, required this.onTap, required this.fetchAvailable});

  final VoidCallback onTap;
  final Future<Paginated<Delivery>> Function() fetchAvailable;

  @override
  State<DeliveryAvailableTile> createState() => _DeliveryAvailableTileState();
}

class _DeliveryAvailableTileState extends State<DeliveryAvailableTile> {
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
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await widget.fetchAvailable();
      if (!mounted) return;
      setState(() => _total = result.total);

      final ids = result.data.map((d) => d.id).toSet();
      if (_seenIds == null) {
        // First fetch just seeds the seen set — nothing to alert about yet.
        _seenIds = ids;
        return;
      }
      final fresh = ids.difference(_seenIds!);
      if (fresh.isEmpty) return;
      _seenIds!.addAll(fresh);
      showLocalNotification('📦 Nouvelle livraison disponible', 'Appuyez pour voir et accepter');
    } catch (_) {
      // Best-effort — keep the last known count on a transient poll failure.
    }
  }

  @override
  Widget build(BuildContext context) {
    final available = _total > 0;
    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        decoration: BoxDecoration(
          color: available ? AppColors.success : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: available ? AppColors.success : AppColors.border),
        ),
        child: Row(
          children: [
            const Text('📦', style: TextStyle(fontSize: 24)),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    available ? '$_total livraison(s) disponible(s)' : 'Livraisons',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: available ? Colors.white : AppColors.text,
                    ),
                  ),
                  Text(
                    available ? 'Appuyez pour voir et accepter' : 'Acceptez des livraisons de colis près de vous',
                    style: TextStyle(
                      fontSize: 14,
                      color: available ? Colors.white.withValues(alpha: 0.85) : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (available)
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
