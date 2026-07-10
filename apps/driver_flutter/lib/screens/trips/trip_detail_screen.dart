import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';
import '../../api/trips_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/trip_urgency_badge.dart';

const _statusLabel = {
  'scheduled': 'Programmé',
  'full': 'Complet',
  'in_progress': 'En cours',
  'completed': 'Terminé',
  'cancelled': 'Annulé',
};

class TripDetailScreen extends StatefulWidget {
  const TripDetailScreen({super.key, required this.tripId, required this.onCancelled});

  final int tripId;
  final VoidCallback onCancelled;

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  Trip? trip;
  bool loading = true;
  bool actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyTrip(widget.tripId);
      setState(() => trip = result);
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _runAction(Future<void> Function() action) async {
    setState(() => actionLoading = true);
    try {
      await action();
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _handleCancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler le trajet'),
        content: const Text('Tous les passagers confirmés seront notifiés. Continuer ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Oui, annuler le trajet')),
        ],
      ),
    );
    if (confirmed != true) return;
    await _runAction(() async {
      await cancelTrip(widget.tripId);
      widget.onCancelled();
    });
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
    final currency = NumberFormat.decimalPattern('fr');
    final confirmedBookings = (t.bookings ?? []).where((b) => b.status == 'confirmed').toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Détails du trajet')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Text(t.originCity?.name ?? '?', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                child: Text('→', style: TextStyle(color: AppColors.textMuted, fontSize: 18)),
              ),
              Text(t.destinationCity?.name ?? '?', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text('${t.departureDate} à ${t.departureTime} · ${_statusLabel[t.status] ?? t.status}',
              style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.sm),
          TripUrgencyBadge(trip: t),
          const SizedBox(height: AppSpacing.lg),
          _Card(
            title: 'Trajet',
            children: [
              Text('${currency.format(t.fare)} FCFA / place', style: const TextStyle(fontSize: 16)),
              Text('${t.availableSeats} place(s) disponible(s) sur ${t.totalSeats}',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
            ],
          ),
          if (t.departureAddress != null || t.departureLatitude != null)
            _Card(
              title: 'Point de rendez-vous',
              children: [
                if (t.departureAddress != null) Text(t.departureAddress!, style: const TextStyle(fontSize: 16)),
                if (t.departureLatitude != null)
                  Text('${t.departureLatitude!.toStringAsFixed(5)}, ${t.departureLongitude!.toStringAsFixed(5)}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              ],
            ),
          Text('Passagers (${confirmedBookings.length})',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          if (confirmedBookings.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: AppSpacing.md),
              child: Text("Aucune réservation pour l'instant.", style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            )
          else
            ...confirmedBookings.map((booking) => _Card(
                  title: '',
                  children: [
                    Text(booking.rider.name ?? 'Passager', style: const TextStyle(fontSize: 16)),
                    Text('${booking.rider.phone} · ${booking.seatsBooked} place(s)',
                        style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => launchUrl(Uri.parse('tel:${booking.rider.phone}')),
                            child: const Text('📞 Appeler'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => launchUrl(Uri.parse('sms:${booking.rider.phone}')),
                            child: const Text('💬 SMS'),
                          ),
                        ),
                      ],
                    ),
                  ],
                )),
          const SizedBox(height: AppSpacing.md),
          if (t.status == 'scheduled' || t.status == 'full')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: ElevatedButton(
                onPressed: actionLoading ? null : () => _runAction(() => startTrip(widget.tripId)),
                child: const Text('Démarrer le trajet'),
              ),
            ),
          if (t.status == 'in_progress')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: ElevatedButton(
                onPressed: actionLoading ? null : () => _runAction(() => completeTrip(widget.tripId)),
                child: const Text('Terminer le trajet'),
              ),
            ),
          if (t.status != 'completed' && t.status != 'cancelled')
            OutlinedButton(
              onPressed: actionLoading ? null : _handleCancel,
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
              child: const Text('Annuler le trajet'),
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
          if (title.isNotEmpty) ...[
            Text(title.toUpperCase(),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
          ],
          ...children,
        ],
      ),
    );
  }
}
