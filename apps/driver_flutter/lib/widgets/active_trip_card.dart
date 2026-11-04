import 'dart:async';

import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';
import '../utils/trip.dart';
import 'mini_route_map.dart';

const _statusLabel = {
  'scheduled': 'Programmé',
  'full': 'Complet',
  'in_progress': 'En cours',
  'completed': 'Terminé',
  'cancelled': 'Annulé',
};

const _fillStateColor = {
  BookingFillState.open: AppColors.success,
  BookingFillState.filling: AppColors.primary,
  BookingFillState.full: AppColors.danger,
};

/// Featured card on the driver home screen: the trip that's either already
/// in progress or next to depart, with its fill status, seats, time to
/// departure and a small route preview — mirrors driver-web's ActiveTripCard.
class ActiveTripCard extends StatefulWidget {
  const ActiveTripCard({super.key, required this.trip, required this.scheduledCount, required this.onTap});

  final Trip trip;
  final int scheduledCount;
  final VoidCallback onTap;

  @override
  State<ActiveTripCard> createState() => _ActiveTripCardState();
}

class _ActiveTripCardState extends State<ActiveTripCard> {
  Timer? _tickTimer;

  @override
  void initState() {
    super.initState();
    // The countdown text is derived from DateTime.now() at build time, so it
    // needs its own tick independent of the parent's data polling.
    _tickTimer = Timer.periodic(const Duration(seconds: 30), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    final inProgress = trip.status == 'in_progress';
    final fillState = bookingFillState(trip);
    final seatsBooked = trip.totalSeats - trip.availableSeats;

    String departureText;
    if (inProgress) {
      departureText = _statusLabel['in_progress']!;
    } else {
      final minutes = (hoursUntilDeparture(trip) * 60).round();
      departureText = minutes <= 5 ? 'Départ imminent' : 'Départ dans ${formatDuration(minutes)}';
    }

    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  inProgress ? 'Trajet en cours' : 'Prochain trajet',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                    letterSpacing: 0.3,
                  ),
                ),
                if (widget.scheduledCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(AppRadius.sm)),
                    child: Text(
                      '${widget.scheduledCount} ${widget.scheduledCount == 1 ? "trajet programmé" : "trajets programmés"}',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.accent),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              '${trip.originCity?.name ?? "?"} → ${trip.destinationCity?.name ?? "?"}',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
              overflow: TextOverflow.ellipsis,
            ),
            Text(departureText, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              children: [
                _Pill(text: fillStateLabel[fillState]!, color: _fillStateColor[fillState]!),
                _Pill(
                  text: trip.availableSeats == 1 ? '1 place restante' : '${trip.availableSeats} places restantes',
                  color: AppColors.text,
                ),
                if (seatsBooked > 0)
                  _Pill(
                    text: seatsBooked == 1 ? '1 place réservée' : '$seatsBooked places réservées',
                    color: AppColors.text,
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            MiniRouteMap(trip: trip),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(text, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
    );
  }
}
