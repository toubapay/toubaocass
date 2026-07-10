import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';
import '../utils/trip.dart' as trip_utils;

class TripUrgencyBadge extends StatelessWidget {
  const TripUrgencyBadge({super.key, required this.trip});

  final Trip trip;

  @override
  Widget build(BuildContext context) {
    final urgent = trip_utils.isUrgent(trip);
    final color = urgent ? AppColors.danger : AppColors.success;
    final background = urgent ? AppColors.dangerSoft : AppColors.successSoft;
    final label = urgent ? '⚡ Départ imminent' : 'Places disponibles';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(AppRadius.sm)),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}
