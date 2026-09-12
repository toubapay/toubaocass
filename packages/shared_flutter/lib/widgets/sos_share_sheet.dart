import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/client.dart';
import '../api/tracking_api.dart';
import '../theme.dart';
import '../utils/my_location.dart';

/// "Share my live position" sheet — generates the 24h signed tracking link
/// then hands it to WhatsApp/SMS with a pre-filled message, and separately
/// offers to alert the platform's own security team. Mirrors the RN apps'
/// SosShareModal. Only meant to be shown while a ride is in_progress; the
/// caller controls that visibility (e.g. a "🆘" button rendered only then).
Future<void> showSosShareSheet(BuildContext context, {required ShareableRideKind kind, required int rideId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => _SosShareSheet(kind: kind, rideId: rideId),
  );
}

class _SosShareSheet extends StatefulWidget {
  const _SosShareSheet({required this.kind, required this.rideId});

  final ShareableRideKind kind;
  final int rideId;

  @override
  State<_SosShareSheet> createState() => _SosShareSheetState();
}

class _SosShareSheetState extends State<_SosShareSheet> {
  String? url;
  String? error;
  bool sendingAlert = false;
  bool alertSent = false;

  @override
  void initState() {
    super.initState();
    fetchShareLink(widget.kind, widget.rideId).then((link) {
      if (mounted) setState(() => url = link);
    }).catchError((e) {
      if (mounted) setState(() => error = extractErrorMessage(e));
    });
  }

  Future<void> _handleSendAlert() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Alerte SOS à l\'administrateur'),
        content: const Text('Envoyer une alerte SOS à l\'équipe de sécurité ? Utilisez ceci uniquement en cas d\'urgence réelle.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('OK')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => sendingAlert = true);
    try {
      double? latitude;
      double? longitude;
      try {
        final coords = await requestMyLocation();
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (_) {
        // best-effort; SOS alert still sent without coordinates
      }
      await sendSosAlert(widget.kind, widget.rideId, latitude: latitude, longitude: longitude);
      if (mounted) setState(() => alertSent = true);
    } catch (e) {
      if (mounted) setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => sendingAlert = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final message = url != null ? 'Suivez mon trajet en direct sur Intercity : $url' : '';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Partager ma position en direct', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.xs),
            const Text('Envoyez ce lien à votre famille pour qu\'elle puisse suivre votre trajet en direct pendant 24 heures.',
                style: TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.md),
            if (url == null && error == null) const Center(child: CircularProgressIndicator(color: AppColors.primary)),
            if (error != null) Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13.5)),
            if (alertSent) const Text('✓ Alerte SOS envoyée. Notre équipe a été prévenue.', style: TextStyle(color: AppColors.success, fontSize: 13.5)),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: alertSent ? null : _handleSendAlert,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                child: sendingAlert
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('🆘 Alerte SOS à l\'administrateur'),
              ),
            ),
            if (url != null) ...[
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}')),
                  child: const Text('Partager via WhatsApp'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => launchUrl(Uri.parse('sms:?body=${Uri.encodeComponent(message)}')),
                  child: const Text('Partager via SMS'),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Fermer')),
            ),
          ],
        ),
      ),
    );
  }
}
