import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';
import '../../api/deliveries_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/my_location.dart';

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

const _locationPingInterval = Duration(seconds: 15);

class DeliveryDetailScreen extends StatefulWidget {
  const DeliveryDetailScreen({super.key, required this.deliveryId});

  final int deliveryId;

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  Delivery? delivery;
  bool loading = true;
  bool busy = false;
  String? error;
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await fetchDelivery(widget.deliveryId);
      if (!mounted) return;
      setState(() => delivery = result);
      _syncPing(result.status);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _syncPing(String status) {
    if (status == 'accepted' || status == 'picked_up') {
      _locationTimer ??= Timer.periodic(_locationPingInterval, (_) => _reportLocation());
    } else {
      _locationTimer?.cancel();
      _locationTimer = null;
    }
  }

  Future<void> _reportLocation() async {
    try {
      final coords = await requestMyLocation();
      await updateDeliveryLocation(widget.deliveryId, coords.latitude, coords.longitude);
    } catch (_) {
      // best-effort
    }
  }

  Future<void> _run(Future<Delivery> Function() action) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final updated = await action();
      if (mounted) {
        setState(() => delivery = updated);
        _syncPing(updated.status);
      }
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || delivery == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    final d = delivery!;

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
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('RAMASSAGE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                Text(d.pickupAddressLine, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.sm),
                Text('EXPÉDITEUR', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                Text('${d.sender.name ?? ''} · ${d.sender.phone}', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
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
                Row(
                  children: [
                    Expanded(child: Text(d.receiverPhone, style: const TextStyle(fontSize: 14, color: AppColors.textMuted))),
                    IconButton(icon: const Icon(Icons.call, size: 18, color: AppColors.primary), onPressed: () => launchUrl(Uri.parse('tel:${d.receiverPhone}'))),
                  ],
                ),
                Text(d.receiverAddressLine, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                if (d.notes != null) Text(d.notes!, style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted, fontStyle: FontStyle.italic)),
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
          if (error != null) Padding(padding: const EdgeInsets.only(bottom: AppSpacing.sm), child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13.5))),
          if (d.status == 'accepted')
            ElevatedButton(onPressed: busy ? null : () => _run(() => markPickedUp(d.id)), child: const Text('Marquer récupéré')),
          if (d.status == 'picked_up')
            ElevatedButton(onPressed: busy ? null : () => _run(() => markDelivered(d.id)), child: const Text('Marquer livré')),
        ],
      ),
    );
  }
}
