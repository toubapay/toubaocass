import 'package:flutter/material.dart';

import '../../api/deliveries_api.dart';
import '../../models.dart';
import '../../theme.dart';

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

class MyDeliveriesScreen extends StatefulWidget {
  const MyDeliveriesScreen({super.key, required this.onOpenDelivery, required this.onNewDelivery});

  final void Function(int deliveryId) onOpenDelivery;
  final VoidCallback onNewDelivery;

  @override
  State<MyDeliveriesScreen> createState() => _MyDeliveriesScreenState();
}

class _MyDeliveriesScreenState extends State<MyDeliveriesScreen> {
  List<Delivery> deliveries = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyDeliveries();
      setState(() => deliveries = result.data);
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes livraisons')),
      floatingActionButton: FloatingActionButton(onPressed: widget.onNewDelivery, child: const Icon(Icons.add)),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  if (deliveries.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                      child: Center(child: Text('Vous n\'avez pas encore de livraison.', style: TextStyle(color: AppColors.textMuted, fontSize: 16))),
                    )
                  else
                    ...deliveries.map((d) => InkWell(
                          onTap: () => widget.onOpenDelivery(d.id),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(_packageLabel[d.packageType] ?? d.packageType, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                    Text(_statusLabel[d.status] ?? d.status, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent)),
                                  ],
                                ),
                                Text('→ ${d.receiverAddressLine}', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                                Text('${d.fee} FCFA', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
                              ],
                            ),
                          ),
                        )),
                ],
              ),
            ),
    );
  }
}
