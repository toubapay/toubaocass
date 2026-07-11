import 'package:flutter/material.dart';

import '../api/bookings_api.dart' as bookings_api;
import '../api/client.dart';
import '../api/trips_api.dart' as trips_api;
import '../models.dart';
import '../theme.dart';

/// Opens the book/modify bottom sheet for [trip] and returns the freshly
/// fetched Trip if the rider confirmed a change, or null if they closed it
/// without saving — lets the caller patch its trip list in place (AJAX-like,
/// no navigation away from the current screen).
Future<Trip?> showBookingQuickActionSheet(BuildContext context, Trip trip) {
  return showModalBottomSheet<Trip>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
    ),
    builder: (context) => _BookingQuickActionSheet(trip: trip),
  );
}

class _BookingQuickActionSheet extends StatefulWidget {
  const _BookingQuickActionSheet({required this.trip});

  final Trip trip;

  @override
  State<_BookingQuickActionSheet> createState() => _BookingQuickActionSheetState();
}

class _BookingQuickActionSheetState extends State<_BookingQuickActionSheet> {
  late int seats = widget.trip.myBooking?.seatsBooked ?? 1;
  bool loading = false;
  String? error;

  bool get editing => widget.trip.myBooking != null;
  int get maxSeats => widget.trip.availableSeats + (widget.trip.myBooking?.seatsBooked ?? 0);

  Future<void> _confirm() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (editing) {
        await bookings_api.updateBooking(widget.trip.myBooking!.id, seats);
      } else {
        await bookings_api.bookTrip(widget.trip.id, seats);
      }
      final updatedTrip = await trips_api.fetchTrip(widget.trip.id);
      if (mounted) Navigator.of(context).pop(updatedTrip);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(editing ? 'Modifier la réservation' : 'Réserver ce trajet',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '${trip.originCity?.name ?? '?'} → ${trip.destinationCity?.name ?? '?'} · ${trip.departureDate} à ${trip.departureTime}',
              style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(editing ? 'Nombre de places' : 'Places à réserver',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => setState(() => seats = (seats - 1).clamp(editing ? 0 : 1, maxSeats)),
                      child: const Text('−'),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                      child: Text('$seats', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                    ),
                    OutlinedButton(
                      onPressed: () => setState(() => seats = (seats + 1).clamp(editing ? 0 : 1, maxSeats)),
                      child: const Text('+'),
                    ),
                  ],
                ),
              ],
            ),
            if (editing && seats == 0)
              const Padding(
                padding: EdgeInsets.only(top: AppSpacing.xs),
                child: Text('Réduire à 0 place annulera votre réservation.',
                    style: TextStyle(color: AppColors.danger, fontSize: 13)),
              ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xs),
                child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
              ),
            const SizedBox(height: AppSpacing.md),
            Text('${trip.fare * seats} FCFA',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(
              onPressed: loading ? null : _confirm,
              style: editing && seats == 0
                  ? ElevatedButton.styleFrom(backgroundColor: AppColors.danger)
                  : null,
              child: loading
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(editing ? (seats == 0 ? 'Annuler la réservation' : 'Enregistrer') : 'Confirmer la réservation'),
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Fermer'),
            ),
          ],
        ),
      ),
    );
  }
}
