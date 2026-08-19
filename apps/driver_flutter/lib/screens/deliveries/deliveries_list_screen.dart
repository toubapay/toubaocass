import 'package:flutter/material.dart';

import '../../api/client.dart';
import '../../api/deliveries_api.dart';
import '../../models.dart';
import '../../theme.dart';

const _packageLabel = {
  'document': 'Document',
  'colis_leger': 'Colis léger (< 5 kg)',
  'colis_moyen': 'Colis moyen (5–15 kg)',
  'colis_volumineux': 'Colis volumineux (> 15 kg)',
};

class DeliveriesListScreen extends StatefulWidget {
  const DeliveriesListScreen({super.key, required this.onOpenDelivery});

  final void Function(int deliveryId) onOpenDelivery;

  @override
  State<DeliveriesListScreen> createState() => _DeliveriesListScreenState();
}

class _DeliveriesListScreenState extends State<DeliveriesListScreen> {
  int tab = 0; // 0 = available, 1 = mine
  List<Delivery> available = [];
  List<Delivery> mine = [];
  bool loading = true;
  int? acceptingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([fetchAvailableDeliveries(), fetchMyDeliveries()]);
      setState(() {
        available = results[0].data;
        mine = results[1].data;
      });
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _accept(Delivery delivery) async {
    setState(() => acceptingId = delivery.id);
    try {
      await acceptDelivery(delivery.id);
      widget.onOpenDelivery(delivery.id);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => acceptingId = null);
    }
  }

  Widget _card(Delivery d, {bool showAccept = false}) {
    return InkWell(
      onTap: () => widget.onOpenDelivery(d.id),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_packageLabel[d.packageType] ?? d.packageType, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            Text('📍 ${d.pickupAddressLine}', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
            Text('→ ${d.receiverAddressLine}', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
            Text('${d.fee} FCFA · ${d.distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
            if (showAccept)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: acceptingId == d.id ? null : () => _accept(d),
                    child: acceptingId == d.id
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Accepter'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Livraisons')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => setState(() => tab = 0),
                    child: Text('Disponibles', style: TextStyle(fontWeight: FontWeight.w700, color: tab == 0 ? AppColors.primary : AppColors.textMuted)),
                  ),
                ),
                Expanded(
                  child: TextButton(
                    onPressed: () => setState(() => tab = 1),
                    child: Text('Mes livraisons', style: TextStyle(fontWeight: FontWeight.w700, color: tab == 1 ? AppColors.primary : AppColors.textMuted)),
                  ),
                ),
              ],
            ),
            const Divider(),
            if (loading)
              const Padding(padding: EdgeInsets.symmetric(vertical: AppSpacing.lg), child: Center(child: CircularProgressIndicator(color: AppColors.primary)))
            else if (tab == 0)
              available.isEmpty
                  ? const Padding(padding: EdgeInsets.symmetric(vertical: AppSpacing.md), child: Text('Aucune livraison disponible pour le moment.', style: TextStyle(color: AppColors.textMuted)))
                  : Column(children: available.map((d) => _card(d, showAccept: true)).toList())
            else
              mine.isEmpty
                  ? const Padding(padding: EdgeInsets.symmetric(vertical: AppSpacing.md), child: Text('Vous n\'avez pas encore de livraison.', style: TextStyle(color: AppColors.textMuted)))
                  : Column(children: mine.map((d) => _card(d)).toList()),
          ],
        ),
      ),
    );
  }
}
