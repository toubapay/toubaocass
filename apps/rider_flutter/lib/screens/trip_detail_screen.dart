import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/bookings_api.dart';
import '../api/client.dart';
import '../api/trips_api.dart';
import '../models.dart';
import '../theme.dart';
import '../utils/trip.dart' as trip_utils;
import '../widgets/route_map.dart';
import '../widgets/trip_urgency_badge.dart';

class TripDetailScreen extends StatefulWidget {
  const TripDetailScreen({super.key, required this.tripId});

  final int tripId;

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  Trip? trip;
  bool loading = true;
  int seats = 1;
  bool booking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchTrip(widget.tripId);
      setState(() {
        trip = result;
        seats = result.myBooking?.seatsBooked ?? 1;
      });
    } finally {
      setState(() => loading = false);
    }
  }

  bool get editing => trip?.myBooking != null;

  Future<void> _handleBook() async {
    setState(() => booking = true);
    try {
      if (editing) {
        await updateBooking(trip!.myBooking!.id, seats);
        if (seats == 0) {
          if (mounted) Navigator.of(context).pop();
          return;
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Réservation mise à jour.')));
        }
        _load();
      } else {
        await bookTrip(widget.tripId, seats);
        if (!mounted) return;
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Réservation confirmée'),
            content: Text(
              'Vous avez réservé $seats place(s). Bon voyage ! Vous pouvez la consulter dans Mes réservations.',
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
            ],
          ),
        );
        if (mounted) Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
      _load();
    } finally {
      if (mounted) setState(() => booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || trip == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Détails du trajet')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final t = trip!;
    final isUnavailable = editing
        ? !['scheduled', 'full'].contains(t.status)
        : t.availableSeats <= 0 || t.status != 'scheduled';
    final maxSeats = editing ? t.availableSeats + (t.myBooking?.seatsBooked ?? 0) : t.availableSeats;
    final hasPin = t.departureLatitude != null && t.departureLongitude != null;
    final currency = NumberFormat.decimalPattern('fr');

    return Scaffold(
      appBar: AppBar(title: const Text('Détails du trajet')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Text(t.originCity?.name ?? '?', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                child: Text('→', style: TextStyle(color: AppColors.textMuted, fontSize: 20)),
              ),
              Text(t.destinationCity?.name ?? '?', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text('${t.departureDate} à ${t.departureTime}', style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.sm),
          TripUrgencyBadge(trip: t),
          if (editing)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Text('✓ Vous avez réservé ${t.myBooking!.seatsBooked} place(s) sur ce trajet',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.success)),
            ),
          const SizedBox(height: AppSpacing.lg),
          if (t.routeDistanceKm != null)
            _Card(
              title: 'Itinéraire',
              children: [
                Text(
                  '🛣️ ${t.routeDistanceKm} km'
                  '${t.routeDurationMinutes != null ? ' · ~${trip_utils.formatDuration(t.routeDurationMinutes!)} de route' : ''}',
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(height: AppSpacing.sm),
                RouteMap(trip: t),
              ],
            ),
          if (hasPin) ...[
            _Card(
              title: 'Point de départ',
              children: [
                if (t.departureAddress != null) Text(t.departureAddress!, style: const TextStyle(fontSize: 18)),
                TextButton(
                  onPressed: () => launchUrl(Uri.parse(
                      'https://www.google.com/maps/search/?api=1&query=${t.departureLatitude},${t.departureLongitude}')),
                  child: const Text('Ouvrir dans Google Maps'),
                ),
              ],
            ),
          ],
          _Card(
            title: 'Conducteur',
            children: [
              Text(t.driver.name ?? 'Conducteur', style: const TextStyle(fontSize: 18)),
              Text('Note : ${t.driver.rating.toStringAsFixed(1)} ★',
                  style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => launchUrl(Uri.parse('tel:${t.driver.phone}')),
                      child: const Text('📞 Appeler'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => launchUrl(Uri.parse('sms:${t.driver.phone}')),
                      child: const Text('💬 SMS'),
                    ),
                  ),
                ],
              ),
            ],
          ),
          _Card(
            title: 'Véhicule',
            children: [
              Text('${t.car?.make ?? ''} ${t.car?.model ?? ''} · ${t.car?.color ?? ''}',
                  style: const TextStyle(fontSize: 18)),
              Text(t.rideType.toUpperCase(), style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
            ],
          ),
          _Card(
            title: 'Tarif',
            children: [
              Text('${currency.format(t.fare)} FCFA / place',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
              Text('${t.availableSeats} place(s) restante(s) sur ${t.totalSeats}',
                  style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
            ],
          ),
          if (t.notes != null && t.notes!.isNotEmpty)
            _Card(title: 'Remarques', children: [Text(t.notes!, style: const TextStyle(fontSize: 18))]),
          if (isUnavailable)
            const Padding(
              padding: EdgeInsets.only(bottom: AppSpacing.md),
              child: Text("Ce trajet n'est plus disponible.",
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.danger)),
            )
          else
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(editing ? 'Nombre de places' : 'Places à réserver',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () => setState(() => seats = (seats - 1).clamp(editing ? 0 : 1, maxSeats)),
                        child: const Text('-'),
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
            ),
          if (editing && seats == 0 && !isUnavailable)
            const Padding(
              padding: EdgeInsets.only(bottom: AppSpacing.md),
              child: Text('Réduire à 0 place annulera votre réservation.',
                  style: TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
          ElevatedButton(
            onPressed: isUnavailable || booking ? null : _handleBook,
            style: editing && seats == 0 ? ElevatedButton.styleFrom(backgroundColor: AppColors.danger) : null,
            child: booking
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(editing
                    ? (seats == 0 ? 'Annuler la réservation' : 'Enregistrer pour ${currency.format(t.fare * seats)} FCFA')
                    : 'Réserver pour ${currency.format(t.fare * seats)} FCFA'),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          ...children,
        ],
      ),
    );
  }
}
