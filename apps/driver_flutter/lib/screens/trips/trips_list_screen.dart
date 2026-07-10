import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../api/trips_api.dart';
import '../../models.dart';
import '../../push/push_service.dart';
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
  const TripsListScreen({super.key, required this.onOpenTrip, required this.onPostTrip});

  final void Function(int tripId) onOpenTrip;
  final VoidCallback onPostTrip;

  @override
  State<TripsListScreen> createState() => _TripsListScreenState();
}

class _TripsListScreenState extends State<TripsListScreen> {
  List<Trip> trips = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    registerPushToken();
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

    return Scaffold(
      appBar: AppBar(title: const Text('Mes trajets')),
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
                          Text('🗺️', style: TextStyle(fontSize: 22)),
                          SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Définir un point de départ sur la carte',
                                    style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
                                Text('Recherchez une adresse ou utilisez votre position actuelle',
                                    style: TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
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
                            style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
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
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(_statusLabel[trip.status] ?? trip.status,
                                        style: TextStyle(
                                            fontSize: 12, fontWeight: FontWeight.w700, color: _statusColor[trip.status])),
                                  ],
                                ),
                                Text(
                                  '${trip.departureDate} à ${trip.departureTime} · ${trip.availableSeats}/${trip.totalSeats} places restantes',
                                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                                ),
                                Text('${currency.format(trip.fare)} FCFA / place',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
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
