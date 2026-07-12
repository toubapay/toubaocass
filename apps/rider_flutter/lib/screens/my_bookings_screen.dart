import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/bookings_api.dart';
import '../api/client.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/booking_quick_action_sheet.dart';

const _statusLabel = {'confirmed': 'Confirmée', 'cancelled': 'Annulée'};

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key, required this.onOpenTrip, required this.onOpenChat});

  final void Function(int tripId) onOpenTrip;
  final void Function(int bookingId, String? title, String? subtitle) onOpenChat;

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<Booking> bookings = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyBookings();
      setState(() => bookings = result.data);
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _handleCancel(Booking booking) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la réservation'),
        content: const Text('Voulez-vous vraiment annuler cette réservation ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Oui, annuler')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await cancelBooking(booking.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  Future<void> _handleModify(Booking booking) async {
    final tripWithMyBooking = booking.trip.copyWithMyBooking(RiderBookingSummary(
      id: booking.id,
      seatsBooked: booking.seatsBooked,
      fareTotal: booking.fareTotal,
      status: booking.status,
    ));
    final updatedTrip = await showBookingQuickActionSheet(context, tripWithMyBooking);
    if (updatedTrip == null) return;
    setState(() {
      bookings = bookings.map((b) {
        if (b.id != booking.id) return b;
        if (updatedTrip.myBooking != null) {
          return Booking(
            id: b.id,
            trip: updatedTrip,
            rider: b.rider,
            seatsBooked: updatedTrip.myBooking!.seatsBooked,
            fareTotal: updatedTrip.myBooking!.fareTotal,
            status: updatedTrip.myBooking!.status,
            createdAt: b.createdAt,
          );
        }
        return Booking(
          id: b.id,
          trip: b.trip,
          rider: b.rider,
          seatsBooked: b.seatsBooked,
          fareTotal: b.fareTotal,
          status: 'cancelled',
          createdAt: b.createdAt,
        );
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.decimalPattern('fr');

    return Scaffold(
      appBar: AppBar(title: const Text('Mes réservations')),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              child: bookings.isEmpty
                  ? ListView(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      children: const [
                        SizedBox(height: AppSpacing.xl),
                        Text(
                          "Vous n'avez pas encore de réservation. Recherchez un trajet pour commencer.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted, fontSize: 16),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      itemCount: bookings.length,
                      itemBuilder: (context, index) {
                        final booking = bookings[index];
                        return InkWell(
                          onTap: () => widget.onOpenTrip(booking.trip.id),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            margin: const EdgeInsets.only(bottom: AppSpacing.md),
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
                                        '${booking.trip.originCity?.name ?? '?'} → ${booking.trip.destinationCity?.name ?? '?'}',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(
                                      _statusLabel[booking.status] ?? booking.status,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: booking.status == 'cancelled' ? AppColors.danger : AppColors.success,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  '${booking.trip.departureDate} à ${booking.trip.departureTime} · ${booking.seatsBooked} place(s)',
                                  style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                                ),
                                Text(
                                  '${currency.format(booking.fareTotal)} FCFA',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary),
                                ),
                                if (booking.status == 'confirmed')
                                  Padding(
                                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                                    child: Wrap(
                                      spacing: AppSpacing.md,
                                      children: [
                                        TextButton(
                                          onPressed: () => widget.onOpenChat(
                                            booking.id,
                                            booking.trip.driver.name ?? 'Conducteur',
                                            '${booking.trip.originCity?.name ?? '?'} → ${booking.trip.destinationCity?.name ?? '?'}',
                                          ),
                                          style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                          child: const Text('💬 Discuter'),
                                        ),
                                        TextButton(
                                          onPressed: () => _handleModify(booking),
                                          style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                          child: const Text('Modifier'),
                                        ),
                                        TextButton(
                                          onPressed: () => _handleCancel(booking),
                                          style: TextButton.styleFrom(foregroundColor: AppColors.danger, padding: EdgeInsets.zero),
                                          child: const Text('Annuler la réservation'),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
