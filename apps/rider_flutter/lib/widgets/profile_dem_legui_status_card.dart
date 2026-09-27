import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/dem_legui_api.dart';
import '../models.dart';
import '../theme.dart';
import 'live_map.dart';

/// Profile-page card for the rider's own active Dem Légui request — shows
/// the same phases as the request detail screen (searching, driver on the
/// way with ETA, trip in progress with live tracking) plus a direct chat
/// shortcut, without requiring a trip into the module to check.
class ProfileDemLeguiStatusCard extends StatefulWidget {
  const ProfileDemLeguiStatusCard({super.key});

  @override
  State<ProfileDemLeguiStatusCard> createState() => _ProfileDemLeguiStatusCardState();
}

class _ProfileDemLeguiStatusCardState extends State<ProfileDemLeguiStatusCard> {
  DemLeguiRequest? _request;
  DemLeguiTrip? _trip;

  @override
  void initState() {
    super.initState();
    fetchMyActiveDemLeguiRequest().then((request) {
      if (!mounted) return;
      setState(() => _request = request);
      if (request?.demLeguiTripId != null) {
        fetchDemLeguiTrip(request!.demLeguiTripId!).then((trip) {
          if (mounted) setState(() => _trip = trip);
        }).catchError((_) {});
      }
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final request = _request;
    final trip = _trip;

    double? driverLat;
    double? driverLng;
    if (trip != null) {
      if (trip.status == 'in_progress') {
        driverLat = trip.currentLatitude;
        driverLng = trip.currentLongitude;
      } else {
        driverLat = trip.driver.currentLatitude;
        driverLng = trip.driver.currentLongitude;
      }
    }

    final String statusLabel;
    if (request == null) {
      statusLabel = '';
    } else if (request.status == 'pending') {
      statusLabel = 'Recherche…';
    } else if (trip?.status == 'in_progress') {
      statusLabel = 'Trajet en cours';
    } else if (trip?.arrivedAt != null) {
      statusLabel = 'Le chauffeur est arrivé';
    } else {
      statusLabel = 'Chauffeur en route';
    }

    return InkWell(
      onTap: request == null ? null : () => context.push('/dem-legui/requests/${request.id}'),
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
            const Text('🚕 Mon trajet Dem Légui', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
            const SizedBox(height: 4),
            if (request == null)
              const Text('Aucun trajet Dem Légui actif', style: TextStyle(fontSize: 14, color: AppColors.textMuted))
            else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text('Vers ${request.destinationCity?.name ?? '—'}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                  ),
                  if (request.status == 'pending')
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    ),
                  const SizedBox(width: 6),
                  Text(statusLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ],
              ),
              if (trip != null && request.etaMinutes != null && trip.status != 'in_progress')
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('⏱ Arrivée dans ${request.etaMinutes} min',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
              if (trip != null && driverLat != null && driverLng != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: LiveMap(currentLatitude: driverLat, currentLongitude: driverLng),
                ),
              if (trip != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: OutlinedButton(
                    onPressed: () => context.push('/dem-legui/requests/${request.id}/chat'),
                    child: const Text('💬 Discuter'),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
