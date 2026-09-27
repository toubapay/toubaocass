import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/api/profile_stats_api.dart';

import '../theme.dart';
import '../utils/my_location.dart';
import 'live_map.dart';

/// Profile-screen stats dashboard — trip/booking counts, Anando activity,
/// earnings, active/last trip shortcuts, and an on-demand "show my
/// position" toggle. Mirrors driver-web's ProfileDashboard.
class ProfileDashboard extends StatefulWidget {
  const ProfileDashboard({super.key, required this.onOpenTrip});

  final void Function(int tripId) onOpenTrip;

  @override
  State<ProfileDashboard> createState() => _ProfileDashboardState();
}

class _ProfileDashboardState extends State<ProfileDashboard> {
  ProfileStats? _stats;
  bool _locating = false;
  bool _showPosition = false;
  Coordinates? _position;
  String? _locationError;

  @override
  void initState() {
    super.initState();
    fetchProfileStats().then((s) {
      if (mounted) setState(() => _stats = s);
    }).catchError((_) {});
  }

  Future<void> _togglePosition() async {
    if (_showPosition) {
      setState(() => _showPosition = false);
      return;
    }
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final coords = await requestMyLocation();
      if (mounted) {
        setState(() {
          _position = coords;
          _showPosition = true;
        });
      }
    } on LocationRequestException catch (e) {
      if (mounted) setState(() => _locationError = e.message);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = _stats;
    if (stats == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            childAspectRatio: 1.5,
            children: [
              _StatTile(icon: '🧭', label: 'Trajets', value: '${stats.tripsCount}'),
              _StatTile(icon: '🎫', label: 'Réservations', value: '${stats.bookingsCount}'),
              _StatTile(
                icon: '🚗',
                label: 'Mes courses Anando',
                value: '${stats.anandoRidesCount}',
                onTap: () => context.push('/anando'),
              ),
              _StatTile(icon: '👥', label: 'Clients', value: '${stats.anandoClientsCount}'),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _StatTile(icon: '💰', label: 'Revenus', value: '${stats.earningsTotal} FCFA', fullWidth: true),
          const SizedBox(height: AppSpacing.sm),
          _TripRow(
            icon: '🟢',
            label: 'Réservation active',
            trip: stats.activeBooking,
            emptyLabel: 'Aucune réservation active',
            onTap: stats.activeBooking == null ? null : () => widget.onOpenTrip(stats.activeBooking!.id),
          ),
          const SizedBox(height: AppSpacing.sm),
          _TripRow(
            icon: '🕓',
            label: 'Dernier trajet',
            trip: stats.lastTrip,
            emptyLabel: 'Aucun trajet passé',
            onTap: stats.lastTrip == null ? null : () => widget.onOpenTrip(stats.lastTrip!.id),
          ),
          const SizedBox(height: AppSpacing.sm),
          InkWell(
            onTap: _locating ? null : _togglePosition,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(AppRadius.md),
                color: AppColors.surface,
              ),
              child: Row(
                children: [
                  const Text('📍', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Ma position', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                        Text(
                          _locating ? 'Localisation…' : (_showPosition ? 'Masquer' : 'Afficher ma position'),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_locationError != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Text(_locationError!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
          if (_showPosition && _position != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: LiveMap(currentLatitude: _position!.latitude, currentLongitude: _position!.longitude),
            ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.icon, required this.label, required this.value, this.onTap, this.fullWidth = false});

  final String icon;
  final String label;
  final String value;
  final VoidCallback? onTap;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(AppRadius.md),
        color: AppColors.surface,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
        ],
      ),
    );
    if (onTap == null) return content;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(AppRadius.md), child: content);
  }
}

class _TripRow extends StatelessWidget {
  const _TripRow({required this.icon, required this.label, required this.trip, required this.emptyLabel, this.onTap});

  final String icon;
  final String label;
  final ProfileTripSummary? trip;
  final String emptyLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(AppRadius.md),
        color: AppColors.surface,
      ),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                Text(
                  trip == null ? emptyLabel : '${trip!.originCity ?? '?'} → ${trip!.destinationCity ?? '?'} · ${trip!.departureDate}',
                  style: TextStyle(fontSize: 14, fontWeight: trip == null ? FontWeight.w400 : FontWeight.w700, color: trip == null ? AppColors.textMuted : AppColors.text),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
    if (trip == null || onTap == null) return content;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(AppRadius.md), child: content);
  }
}
