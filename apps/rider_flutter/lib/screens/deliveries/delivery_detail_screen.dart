import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';
import '../../api/deliveries_api.dart';
import '../../api/tracking_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/sos_share_sheet.dart';

const _packageLabel = {
  'document': 'Document',
  'colis_leger': 'Colis léger (< 5 kg)',
  'colis_moyen': 'Colis moyen (5–15 kg)',
  'colis_volumineux': 'Colis volumineux (> 15 kg)',
};

const _statusLabel = {
  'pending': 'En attente',
  'accepted': 'Acceptée',
  'picked_up': 'Récupérée',
  'delivered': 'Livrée',
  'cancelled': 'Annulée',
};

class DeliveryDetailScreen extends StatefulWidget {
  const DeliveryDetailScreen({super.key, required this.deliveryId, required this.onEdit});

  final int deliveryId;
  final void Function(int deliveryId) onEdit;

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  Delivery? delivery;
  bool loading = true;
  bool cancelling = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await fetchDelivery(widget.deliveryId);
      if (mounted) setState(() => delivery = result);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la livraison'),
        content: const Text('Voulez-vous vraiment annuler cette livraison ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Oui, annuler')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => cancelling = true);
    try {
      await cancelDelivery(widget.deliveryId);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || delivery == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    final d = delivery!;
    final canManage = d.status == 'pending';

    return Scaffold(
      appBar: AppBar(title: Text('Livraison #${d.id}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Text(_packageLabel[d.packageType] ?? d.packageType, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(_statusLabel[d.status] ?? d.status, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.accent)),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (d.status == 'picked_up')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: OutlinedButton(
                onPressed: () => showSosShareSheet(context, kind: ShareableRideKind.deliveries, rideId: d.id),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                child: const Text('🆘 Suivre en direct'),
              ),
            ),
          if (d.driver != null)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('LIVREUR', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  Row(
                    children: [
                      Expanded(child: Text('${d.driver!.name ?? ''} · ${d.driver!.phone}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
                      IconButton(icon: const Icon(Icons.call, size: 18, color: AppColors.primary), onPressed: () => launchUrl(Uri.parse('tel:${d.driver!.phone}'))),
                    ],
                  ),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('RAMASSAGE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                Text(d.pickupAddressLine, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('DESTINATAIRE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                Text(d.receiverName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                Text(d.receiverPhone, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                Text(d.receiverAddressLine, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                if (d.notes != null && d.notes!.isNotEmpty) Text(d.notes!, style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted, fontStyle: FontStyle.italic)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('FRAIS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                Text('${d.fee} FCFA', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
                Text(d.paymentMethod == 'wallet' ? 'Portefeuille' : 'Espèces', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
              ],
            ),
          ),
          if (canManage) ...[
            OutlinedButton(onPressed: () => widget.onEdit(d.id), child: const Text('Modifier')),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: cancelling ? null : _cancel,
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
              child: cancelling
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Annuler la livraison'),
            ),
          ],
        ],
      ),
    );
  }
}
