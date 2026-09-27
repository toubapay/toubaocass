import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/anando_api.dart';
import '../models.dart';
import '../theme.dart';

const _activeRideStatuses = ['open', 'full', 'in_progress'];

/// Profile-page card for the rider's own posted Anando ride — shows the
/// details a driver/poster cares about at a glance (seats left, how many
/// customers have booked, whether it has already departed) rather than just
/// a route + status line.
class ProfileAnandoStatusCard extends StatefulWidget {
  const ProfileAnandoStatusCard({super.key});

  @override
  State<ProfileAnandoStatusCard> createState() => _ProfileAnandoStatusCardState();
}

class _ProfileAnandoStatusCardState extends State<ProfileAnandoStatusCard> {
  AnandoRide? _ride;

  @override
  void initState() {
    super.initState();
    fetchMyAnandoRides().then((res) {
      if (!mounted) return;
      final matches = res.data.where((r) => _activeRideStatuses.contains(r.status) && !isAnandoRideStale(r)).toList();
      setState(() => _ride = matches.isEmpty ? null : matches.first);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;

    return InkWell(
      onTap: ride == null ? null : () => context.push('/anando/${ride.id}'),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(AppRadius.md),
          color: AppColors.surface,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('🚗 Mon trajet Anando', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
            const SizedBox(height: 4),
            if (ride == null)
              const Text('Aucun trajet Anando actif', style: TextStyle(fontSize: 14, color: AppColors.textMuted))
            else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text('${ride.originCity?.name ?? '?'} → ${ride.destinationCity?.name ?? '?'}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: ride.status == 'open' ? AppColors.successSoft : AppColors.accentSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(ride.status,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: ride.status == 'open' ? AppColors.success : AppColors.accent)),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${ride.totalSeats - ride.availableSeats}/${ride.totalSeats} places réservées · ${ride.availableSeats} disponible(s)',
                  style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '${(ride.bookings ?? []).where((b) => b.status == 'confirmed').length} client(s) inscrit(s)',
                  style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted),
                ),
              ),
              if (ride.status == 'in_progress' || ride.startedAt != null)
                const Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text('🚦 Trajet parti', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
