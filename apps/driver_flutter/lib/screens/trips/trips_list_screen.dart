import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/trips_api.dart';
import '../../api/wallet_api.dart';
import '../../models.dart';
import '../../push/push_service.dart';
import '../../state/module_status_provider.dart';
import '../../theme.dart';

const _statusColor = {
  'scheduled': AppColors.success,
  'full': AppColors.accent,
  'in_progress': AppColors.primary,
  'completed': AppColors.textMuted,
  'cancelled': AppColors.danger,
};

const _statusLabel = {
  'scheduled': 'Programmé',
  'full': 'Complet',
  'in_progress': 'En cours',
  'completed': 'Terminé',
  'cancelled': 'Annulé',
};

class TripsListScreen extends StatefulWidget {
  const TripsListScreen({
    super.key,
    required this.onOpenTrip,
    required this.onPostTrip,
    required this.onOpenWallet,
    required this.onOpenDemLegui,
    required this.onOpenAnando,
    required this.onOpenDeliveries,
  });

  final void Function(int tripId) onOpenTrip;
  final VoidCallback onPostTrip;
  final VoidCallback onOpenWallet;
  final VoidCallback onOpenDemLegui;
  final VoidCallback onOpenAnando;
  final VoidCallback onOpenDeliveries;

  @override
  State<TripsListScreen> createState() => _TripsListScreenState();
}

class _TripsListScreenState extends State<TripsListScreen> {
  List<Trip> trips = [];
  bool loading = true;
  int? walletBalance;

  @override
  void initState() {
    super.initState();
    _load();
    registerPushToken();
    fetchWallet().then((w) => setState(() => walletBalance = w.balance)).catchError((_) {});
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyTrips();
      setState(() => trips = result.data);
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.decimalPattern('fr');
    final moduleStatus = context.watch<ModuleStatusProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes trajets'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: Center(
              child: OutlinedButton.icon(
                onPressed: widget.onOpenWallet,
                icon: const Icon(Icons.account_balance_wallet, size: 16, color: AppColors.accent),
                label: Text(
                  walletBalance != null ? '${walletBalance!} F' : '…',
                  style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w700, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  backgroundColor: AppColors.accentSoft,
                  side: BorderSide.none,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
                ),
              ),
            ),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  InkWell(
                    onTap: widget.onPostTrip,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      margin: const EdgeInsets.only(bottom: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.accentSoft,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Row(
                        children: [
                          Text('🗺️', style: TextStyle(fontSize: 24)),
                          SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Définir un point de départ sur la carte',
                                    style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.w700)),
                                Text('Recherchez une adresse ou utilisez votre position actuelle',
                                    style: TextStyle(fontSize: 14.0, color: AppColors.textMuted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (moduleStatus.isEnabled('dem_legui'))
                    InkWell(
                      onTap: widget.onOpenDemLegui,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Row(
                          children: [
                            Text('🚕', style: TextStyle(fontSize: 24)),
                            SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Demandes Dem Légui', style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.w700)),
                                  Text('Acceptez des courses à la demande près de vous',
                                      style: TextStyle(fontSize: 14.0, color: AppColors.textMuted)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (moduleStatus.isEnabled('anando'))
                    InkWell(
                      onTap: widget.onOpenAnando,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Row(
                          children: [
                            Text('🚗', style: TextStyle(fontSize: 24)),
                            SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Anando', style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.w700)),
                                  Text('Covoiturage instantané', style: TextStyle(fontSize: 14.0, color: AppColors.textMuted)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (moduleStatus.isEnabled('livraison'))
                    InkWell(
                      onTap: widget.onOpenDeliveries,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Row(
                          children: [
                            Text('📦', style: TextStyle(fontSize: 24)),
                            SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Livraisons', style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.w700)),
                                  Text('Acceptez des livraisons de colis près de vous', style: TextStyle(fontSize: 14.0, color: AppColors.textMuted)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (trips.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                      child: Center(
                        child: Text("Vous n'avez publié aucun trajet pour l'instant.",
                            style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
                      ),
                    )
                  else
                    ...trips.map((trip) => InkWell(
                          onTap: () => widget.onOpenTrip(trip.id),
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
                                        '${trip.originCity?.name ?? '?'} → ${trip.destinationCity?.name ?? '?'}',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(_statusLabel[trip.status] ?? trip.status,
                                        style: TextStyle(
                                            fontSize: 13, fontWeight: FontWeight.w700, color: _statusColor[trip.status])),
                                  ],
                                ),
                                Text(
                                  '${trip.departureDate} à ${trip.departureTime} · ${trip.availableSeats}/${trip.totalSeats} places restantes',
                                  style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                                ),
                                Text('${currency.format(trip.fare)} FCFA / place',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),
                              ],
                            ),
                          ),
                        )),
                  ElevatedButton(onPressed: widget.onPostTrip, child: const Text('Publier un nouveau trajet')),
                ],
              ),
            ),
    );
  }
}
