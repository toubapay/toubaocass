import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:shared_flutter/widgets/driver_tier_badge.dart';
import 'package:shared_flutter/widgets/rate_driver_card.dart';

import '../api/deliveries_api.dart';
import '../api/dem_legui_api.dart';
import '../api/ratings_api.dart';
import '../api/trips_api.dart';
import '../theme.dart';

/// Shown on the rider Home screen right after a trip/delivery/Dem Légui
/// course completes and the rider hasn't rated the driver yet (see
/// fetchPendingRating / RatingController::pendingRating on the backend).
/// Mirrors rider-web's PostTripRatingModal. The caller is responsible for
/// marking the prompt "seen" (see utils/rating_prompt_seen.dart) before
/// showing this — riders can still rate later from their history list.
void showPostTripRatingSheet(BuildContext context, PendingRating pending) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
    ),
    builder: (context) => _PostTripRatingSheetContent(pending: pending),
  );
}

class _PostTripRatingSheetContent extends StatefulWidget {
  const _PostTripRatingSheetContent({required this.pending});

  final PendingRating pending;

  @override
  State<_PostTripRatingSheetContent> createState() => _PostTripRatingSheetContentState();
}

class _PostTripRatingSheetContentState extends State<_PostTripRatingSheetContent> {
  Future<void> _handleSubmit(int score, String? comment) async {
    final p = widget.pending;
    if (p.type == 'trip') {
      await rateTrip(p.id, score: score, comment: comment);
    } else if (p.type == 'delivery') {
      await rateDelivery(p.id, score: score, comment: comment);
    } else {
      await rateDemLeguiTrip(p.id, score: score, comment: comment);
    }
    // Give the rider a moment to see the "Merci !" confirmation inside
    // RateDriverCard before the sheet closes on its own.
    Timer(const Duration(milliseconds: 1200), () {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.pending;
    final currency = NumberFormat.decimalPattern('fr');

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: AppSpacing.lg + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Votre trajet est terminé', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(p.driver.name ?? 'Conducteur', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      DriverTierBadge(tier: p.driver.tier),
                    ],
                  ),
                  if (p.originLabel != null || p.destinationLabel != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '${p.originLabel ?? ''}${p.originLabel != null && p.destinationLabel != null ? ' → ' : ''}${p.destinationLabel ?? ''}',
                        style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                      ),
                    ),
                  if (p.distanceKm != null || p.durationMinutes != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        [
                          if (p.distanceKm != null) '${p.distanceKm} km',
                          if (p.durationMinutes != null) '${p.durationMinutes} min',
                        ].join(' · '),
                        style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted),
                      ),
                    ),
                  if (p.cost != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('${currency.format(p.cost)} FCFA',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
                    ),
                ],
              ),
            ),
            RateDriverCard(onSubmit: _handleSubmit),
          ],
        ),
      ),
    );
  }
}
