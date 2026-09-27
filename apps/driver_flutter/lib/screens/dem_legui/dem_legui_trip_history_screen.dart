import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../api/dem_legui_api.dart';
import '../../models.dart';
import '../../theme.dart';

const _statusColor = {
  'completed': AppColors.textMuted,
  'cancelled': AppColors.danger,
};

const _statusLabel = {
  'completed': 'Terminé',
  'cancelled': 'Annulé',
};

/// Completed/cancelled Dem Légui trips only — reached from Profile. The
/// driver's active/in-progress trip lives on Home instead, so it never
/// shows up here. Mirrors driver-web's DemLeguiTripHistoryPage.
class DemLeguiTripHistoryScreen extends StatefulWidget {
  const DemLeguiTripHistoryScreen({super.key, required this.onOpenTrip});

  final void Function(int tripId) onOpenTrip;

  @override
  State<DemLeguiTripHistoryScreen> createState() => _DemLeguiTripHistoryScreenState();
}

class _DemLeguiTripHistoryScreenState extends State<DemLeguiTripHistoryScreen> {
  List<DemLeguiTrip> _trips = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    fetchMyDemLeguiTripHistory().then((res) {
      if (mounted) setState(() => _trips = res.data);
    }).whenComplete(() {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.decimalPattern('fr');

    return Scaffold(
      appBar: AppBar(title: const Text('Historique Dem Légui')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _trips.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Text("Vous n'avez pas encore effectué de trajet Dem Légui.",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: _trips.length,
                  itemBuilder: (context, index) {
                    final trip = _trips[index];
                    return InkWell(
                      onTap: () => widget.onOpenTrip(trip.id),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
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
                                  child: Text('Vers ${trip.destinationCity?.name ?? '—'}',
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                      overflow: TextOverflow.ellipsis),
                                ),
                                Text(
                                  _statusLabel[trip.status] ?? trip.status,
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _statusColor[trip.status] ?? AppColors.textMuted),
                                ),
                              ],
                            ),
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${trip.availableSeats}/${trip.totalSeats} places disponibles',
                                  style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${currency.format(trip.pricePerSeat)} FCFA',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
