import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../api/dem_legui_api.dart';
import '../../models.dart';
import '../../theme.dart';

const _statusColor = {
  'pending': AppColors.textMuted,
  'matched': AppColors.accent,
  'cancelled': AppColors.danger,
  'expired': AppColors.danger,
};

const _statusLabel = {
  'pending': 'En attente',
  'matched': 'Chauffeur trouvé',
  'cancelled': 'Annulée',
  'expired': 'Expirée',
};

/// Dedicated Dem Légui request history, reachable from Profile — mirrors
/// rider-web's DemLeguiHistoryPage.
class DemLeguiHistoryScreen extends StatefulWidget {
  const DemLeguiHistoryScreen({super.key, required this.onOpenRequest});

  final void Function(int requestId) onOpenRequest;

  @override
  State<DemLeguiHistoryScreen> createState() => _DemLeguiHistoryScreenState();
}

class _DemLeguiHistoryScreenState extends State<DemLeguiHistoryScreen> {
  List<DemLeguiRequest> _requests = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    fetchMyDemLeguiRequests().then((res) {
      if (mounted) setState(() => _requests = res.data);
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
          : _requests.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Text("Vous n'avez pas encore fait de trajet Dem Légui.",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: _requests.length,
                  itemBuilder: (context, index) {
                    final request = _requests[index];
                    return InkWell(
                      onTap: () => widget.onOpenRequest(request.id),
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
                                  child: Text('Vers ${request.destinationCity?.name ?? '—'}',
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                      overflow: TextOverflow.ellipsis),
                                ),
                                Text(
                                  _statusLabel[request.status] ?? request.status,
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _statusColor[request.status] ?? AppColors.textMuted),
                                ),
                              ],
                            ),
                            if (request.pickupAddress != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(request.pickupAddress!, style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                              ),
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${currency.format(request.fareTotal)} FCFA',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
                            ),
                            if (request.tripStatus == 'completed')
                              Padding(
                                padding: const EdgeInsets.only(top: AppSpacing.sm),
                                child: TextButton(
                                  onPressed: () => widget.onOpenRequest(request.id),
                                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                                  child: const Text('Noter le chauffeur', style: TextStyle(fontWeight: FontWeight.w700)),
                                ),
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
