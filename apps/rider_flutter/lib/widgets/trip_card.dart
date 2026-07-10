import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../theme.dart';
import '../utils/trip.dart' as trip_utils;
import 'trip_urgency_badge.dart';

class TripCard extends StatelessWidget {
  const TripCard({super.key, required this.trip, required this.onTap});

  final Trip trip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fillState = trip_utils.bookingFillState(trip);
    final fillColor = switch (fillState) {
      trip_utils.BookingFillState.open => AppColors.success,
      trip_utils.BookingFillState.filling => AppColors.primary,
      trip_utils.BookingFillState.full => AppColors.danger,
    };
    final currency = NumberFormat.decimalPattern('fr');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${trip.originCity?.name ?? '?'} → ${trip.destinationCity?.name ?? '?'}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TripUrgencyBadge(trip: trip),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '${trip.departureDate} à ${trip.departureTime}',
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
            if (trip.distanceKm != null)
              Text(
                '${trip.distanceKm!.toStringAsFixed(1)} km de vous',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${currency.format(trip.fare)} FCFA',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary),
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.accentSoft,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Text(
                        trip_utils.rideTypeLabel[trip.rideType] ?? trip.rideType,
                        style: const TextStyle(fontSize: 11, color: AppColors.accent, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      trip_utils.fillStateLabel[fillState]!,
                      style: TextStyle(fontSize: 12, color: fillColor, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
