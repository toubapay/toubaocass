import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';
import '../../api/dem_legui_api.dart';
import '../../api/tracking_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/sos_share_sheet.dart';
import '../chat_screen.dart';

const _pollInterval = Duration(seconds: 8);

const _statusLabel = {
  'pending': 'Recherche d\'un chauffeur…',
  'matched': 'Chauffeur trouvé',
  'cancelled': 'Annulée',
  'expired': 'Expirée',
};

class DemLeguiRequestDetailScreen extends StatefulWidget {
  const DemLeguiRequestDetailScreen({super.key, required this.requestId, required this.onOpenChat});

  final int requestId;
  final void Function(int requestId, String title, String subtitle) onOpenChat;

  @override
  State<DemLeguiRequestDetailScreen> createState() => _DemLeguiRequestDetailScreenState();
}

class _DemLeguiRequestDetailScreenState extends State<DemLeguiRequestDetailScreen> {
  DemLeguiRequest? request;
  DemLeguiTrip? trip;
  bool loading = true;
  bool cancelling = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await fetchDemLeguiRequest(widget.requestId);
      if (!mounted) return;
      setState(() => request = r);
      if (r.demLeguiTripId != null) {
        try {
          final t = await fetchDemLeguiTrip(r.demLeguiTripId!);
          if (mounted) setState(() => trip = t);
        } catch (_) {
          // keep last known trip on a transient failure
        }
      }
      _syncPolling();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _syncPolling() {
    final r = request;
    if (r == null || r.status == 'cancelled' || r.status == 'expired') {
      _pollTimer?.cancel();
      return;
    }
    if (trip?.status == 'completed' || trip?.status == 'cancelled') {
      _pollTimer?.cancel();
      return;
    }
    _pollTimer ??= Timer.periodic(_pollInterval, (_) => _load());
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la demande'),
        content: const Text('Voulez-vous vraiment annuler cette demande ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Oui, annuler')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => cancelling = true);
    try {
      await cancelDemLeguiRequest(widget.requestId);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || request == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    final r = request!;
    final t = trip;
    final canCancel = r.status == 'pending' || (r.status == 'matched' && t?.status == 'open');

    return Scaffold(
      appBar: AppBar(title: Text('Vers ${r.destinationCity?.name ?? '?'}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(_statusLabel[r.status] ?? r.status, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.md),
          if (t != null && t.status == 'in_progress')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: OutlinedButton(
                onPressed: () => showSosShareSheet(context, kind: ShareableRideKind.demLeguiTrips, rideId: t.id),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                child: const Text('🆘 Partager ma position'),
              ),
            ),
          if (t != null && t.currentLatitude != null && t.currentLongitude != null && t.status == 'in_progress')
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(AppRadius.md)),
              child: Text(
                'Position du chauffeur : ${t.currentLatitude!.toStringAsFixed(4)}, ${t.currentLongitude!.toStringAsFixed(4)}',
                style: const TextStyle(fontSize: 13, color: AppColors.accent),
              ),
            ),
          if (t?.arrivedAt != null && t?.status == 'open')
            const Padding(
              padding: EdgeInsets.only(bottom: AppSpacing.md),
              child: Text('🚩 Votre chauffeur est arrivé au point de rendez-vous',
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13.5)),
            ),
          if (t != null)
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
                  const Text('VOTRE CHAUFFEUR', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  const SizedBox(height: AppSpacing.xs),
                  Text(t.driver.name ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  Text(t.driver.phone, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                  Text('★ ${t.driver.rating.toStringAsFixed(1)}', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                  if (t.car != null)
                    Text('🚗 ${t.car!.make} ${t.car!.model} · ${t.car!.plateNumber}',
                        style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                  if (r.etaMinutes != null)
                    Text('⏱ ${r.etaMinutes} min', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
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
                          onPressed: () => widget.onOpenChat(r.id, t.driver.name ?? 'Chauffeur', 'Vers ${r.destinationCity?.name ?? '?'}'),
                          child: const Text('💬 Discuter'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
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
                const Text('RAMASSAGE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                const SizedBox(height: AppSpacing.xs),
                Text(r.pickupAddress ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ],
            ),
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
                const Text('TARIF', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                const SizedBox(height: AppSpacing.xs),
                Text('${r.fareTotal} FCFA', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
                Text('${r.seatsRequested} place(s)', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
              ],
            ),
          ),
          if (canCancel)
            OutlinedButton(
              onPressed: cancelling ? null : _cancel,
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
              child: cancelling
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Annuler la demande'),
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
