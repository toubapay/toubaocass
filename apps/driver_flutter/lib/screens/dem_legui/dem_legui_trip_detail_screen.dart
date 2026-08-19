import 'dart:async';

import 'package:flutter/material.dart';

import '../../api/client.dart';
import '../../api/dem_legui_api.dart';
import '../../api/tracking_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/my_location.dart';
import '../../widgets/sos_share_sheet.dart';
import '../chat_screen.dart';

const _liveIntervalMs = 12000;

const _statusLabel = {
  'open': 'Ouvert',
  'in_progress': 'En cours',
  'completed': 'Terminé',
  'cancelled': 'Annulé',
};

class DemLeguiTripDetailScreen extends StatefulWidget {
  const DemLeguiTripDetailScreen({super.key, required this.tripId, required this.onFindMore, required this.onOpenChat});

  final int tripId;
  final VoidCallback onFindMore;
  final void Function(int requestId, String title, String subtitle) onOpenChat;

  @override
  State<DemLeguiTripDetailScreen> createState() => _DemLeguiTripDetailScreenState();
}

class _DemLeguiTripDetailScreenState extends State<DemLeguiTripDetailScreen> {
  DemLeguiTrip? trip;
  bool loading = true;
  bool starting = false;
  bool arriving = false;
  bool completing = false;
  Timer? _pollTimer;
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await fetchDemLeguiTrip(widget.tripId);
      if (!mounted) return;
      setState(() => trip = result);
      _syncTimers(result.status);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _syncTimers(String status) {
    if (status == 'in_progress') {
      _pollTimer ??= Timer.periodic(const Duration(milliseconds: _liveIntervalMs), (_) => _load());
      _locationTimer ??= Timer.periodic(const Duration(milliseconds: _liveIntervalMs), (_) => _reportLocation());
      _reportLocation();
    } else {
      _pollTimer?.cancel();
      _locationTimer?.cancel();
      _pollTimer = null;
      _locationTimer = null;
    }
  }

  Future<void> _reportLocation() async {
    try {
      final coords = await requestMyLocation();
      await updateDemLeguiTripLocation(widget.tripId, coords.latitude, coords.longitude);
    } catch (_) {
      // best-effort
    }
  }

  Future<void> _runAction(Future<DemLeguiTrip> Function() action, void Function(bool) setBusy) async {
    setBusy(true);
    try {
      final updated = await action();
      if (mounted) {
        setState(() => trip = updated);
        _syncTimers(updated.status);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setBusy(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || trip == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    final t = trip!;

    return Scaffold(
      appBar: AppBar(title: Text('Vers ${t.destinationCity?.name ?? '?'}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text('${_statusLabel[t.status] ?? t.status} · ${t.availableSeats}/${t.totalSeats} places restantes',
              style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.md),
          if (t.status == 'in_progress')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: OutlinedButton(
                onPressed: () => showSosShareSheet(context, kind: ShareableRideKind.demLeguiTrips, rideId: t.id),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                child: const Text('🆘 Partager ma position'),
              ),
            ),
          if (t.status == 'in_progress' && t.currentLatitude != null && t.currentLongitude != null)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.accentSoft,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Text(
                'Position en direct : ${t.currentLatitude!.toStringAsFixed(4)}, ${t.currentLongitude!.toStringAsFixed(4)}',
                style: const TextStyle(fontSize: 13, color: AppColors.accent),
              ),
            ),
          if (t.arrivedAt != null && t.status == 'open')
            const Padding(
              padding: EdgeInsets.only(bottom: AppSpacing.md),
              child: Text('🚩 Vous avez signalé votre arrivée au point de rendez-vous',
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13.5)),
            ),
          Container(
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
                Text('PASSAGERS (${t.requests?.length ?? 0})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                const SizedBox(height: AppSpacing.sm),
                if ((t.requests ?? []).isEmpty)
                  const Text('Aucun passager pour l\'instant.', style: TextStyle(color: AppColors.textMuted, fontSize: 13.5))
                else
                  ...t.requests!.map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r.rider.name ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            Text('${r.rider.phone} · 📍 ${r.pickupAddress ?? ''}',
                                style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                            Text('${r.seatsRequested} place(s)', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                            const SizedBox(height: 4),
                            OutlinedButton(
                              onPressed: () => widget.onOpenChat(r.id, r.rider.name ?? 'Passager', 'Vers ${t.destinationCity?.name ?? '?'}'),
                              child: const Text('💬 Discuter'),
                            ),
                          ],
                        ),
                      )),
              ],
            ),
          ),
          if (t.status == 'open') ...[
            OutlinedButton(onPressed: widget.onFindMore, child: const Text('Trouver d\'autres passagers')),
            const SizedBox(height: AppSpacing.sm),
          ],
          if (t.status == 'open' && t.arrivedAt == null) ...[
            OutlinedButton(
              onPressed: arriving ? null : () => _runAction(() => arriveAtDemLeguiPickup(t.id), (v) => setState(() => arriving = v)),
              child: arriving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('🚩 Je suis arrivé'),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          if (t.status == 'open')
            ElevatedButton(
              onPressed: starting ? null : () => _runAction(() => startDemLeguiTrip(t.id), (v) => setState(() => starting = v)),
              child: starting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Démarrer le trajet'),
            ),
          if (t.status == 'in_progress')
            ElevatedButton(
              onPressed: completing ? null : () => _runAction(() => completeDemLeguiTrip(t.id), (v) => setState(() => completing = v)),
              child: completing
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Terminer le trajet'),
            ),
        ],
      ),
    );
  }
}

class DemLeguiChatScreen extends StatelessWidget {
  const DemLeguiChatScreen({super.key, required this.requestId, this.title, this.subtitle});

  final int requestId;
  final String? title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return ChatScreen.custom(
      fetchMessages: () => fetchDemLeguiMessages(requestId),
      sendMessage: (body) => sendDemLeguiMessage(requestId, body),
      title: title,
      subtitle: subtitle,
    );
  }
}
