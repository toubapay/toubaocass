import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/cars_api.dart';
import '../../api/client.dart';
import '../../api/dem_legui_api.dart';
import '../../api/trips_api.dart' show Paginated;
import '../../models.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';
import '../../widgets/driver_availability_toggle.dart';

const _myTripsPollInterval = Duration(seconds: 20);

class DemLeguiRequestsScreen extends StatefulWidget {
  const DemLeguiRequestsScreen({super.key, required this.onOpenTrip});

  final void Function(int tripId) onOpenTrip;

  @override
  State<DemLeguiRequestsScreen> createState() => _DemLeguiRequestsScreenState();
}

class _DemLeguiRequestsScreenState extends State<DemLeguiRequestsScreen> {
  List<DemLeguiRequest> requests = [];
  List<Car> cars = [];
  List<DemLeguiTrip> myTrips = [];
  bool loading = true;
  int? acceptingId;
  bool? _wasOnline;
  Timer? _myTripsTimer;

  bool get isOnline => context.read<AuthProvider>().user?.driverProfile?.isOnline ?? false;

  @override
  void initState() {
    super.initState();
    _load();
    _loadMyTrips();
    _myTripsTimer = Timer.periodic(_myTripsPollInterval, (_) => _loadMyTrips());
  }

  @override
  void dispose() {
    _myTripsTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadMyTrips() async {
    try {
      final trip = await fetchMyActiveDemLeguiTrip();
      if (!mounted) return;
      setState(() => myTrips = trip == null ? [] : [trip]);
    } catch (_) {
      // Best-effort — keep the last known list on a transient poll failure.
    }
  }

  Future<void> _load() async {
    if (!isOnline) {
      setState(() => loading = false);
      return;
    }
    setState(() => loading = true);
    try {
      final results = await Future.wait([fetchAvailableDemLeguiRequests(), fetchMyCars()]);
      setState(() {
        requests = (results[0] as Paginated<DemLeguiRequest>).data;
        cars = (results[1] as List<Car>).where((c) => c.isActive).toList();
      });
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _accept(DemLeguiRequest request, int? carId) async {
    setState(() => acceptingId = request.id);
    try {
      final trip = await acceptDemLeguiRequest(request.id, carId: carId);
      if (mounted) widget.onOpenTrip(trip.id);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => acceptingId = null);
    }
  }

  Future<void> _handleAccept(DemLeguiRequest request) async {
    if (cars.length <= 1) {
      await _accept(request, cars.isEmpty ? null : cars.first.id);
      return;
    }
    final chosen = await showModalBottomSheet<Car>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: cars
              .map((car) => ListTile(
                    title: Text('${car.make} ${car.model} · ${car.plateNumber}'),
                    onTap: () => Navigator.of(context).pop(car),
                  ))
              .toList(),
        ),
      ),
    );
    if (chosen != null) await _accept(request, chosen.id);
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild when the online flag flips.
    context.watch<AuthProvider>();
    final nowOnline = isOnline;
    if (_wasOnline == false && nowOnline) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
    _wasOnline = nowOnline;

    final hasActiveTrip = myTrips.isNotEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Demandes Dem Légui')),
      body: RefreshIndicator(
        onRefresh: () => Future.wait([_load(), _loadMyTrips()]),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            if (myTrips.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.only(bottom: AppSpacing.xs),
                child: Text('MES TRAJETS EN COURS',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              ),
              ...myTrips.map((t) {
                final inProgress = t.status == 'in_progress';
                return InkWell(
                  onTap: () => widget.onOpenTrip(t.id),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: inProgress ? AppColors.primary : AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: inProgress ? AppColors.primary : AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Vers ${t.destinationCity?.name ?? '?'}',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w700, color: inProgress ? Colors.white : AppColors.text)),
                        Text(
                          '${inProgress ? 'En cours' : 'Ouvert'} · ${t.availableSeats}/${t.totalSeats} places restantes',
                          style: TextStyle(fontSize: 13.5, color: inProgress ? Colors.white70 : AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.md),
            ],
            const DriverAvailabilityToggle(),
            if (hasActiveTrip)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                child: Center(
                  child: Text("Terminez votre trajet en cours avant d'en accepter un nouveau.",
                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                ),
              )
            else if (!isOnline)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                child: Center(
                  child: Text('Passez en ligne pour voir les demandes de course à proximité.',
                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                ),
              )
            else if (loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              )
            else if (requests.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                child: Center(
                  child: Text('Aucune demande à proximité pour le moment.', style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                ),
              )
            else
              ...requests.map((r) => Container(
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
                        Text('Vers ${r.destinationCity?.name ?? '?'}',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text('📍 ${r.pickupAddress ?? ''}', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                        Text('${r.seatsRequested} place(s)', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                        Text('${r.fareTotal} FCFA', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        const SizedBox(height: AppSpacing.sm),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: acceptingId == r.id ? null : () => _handleAccept(r),
                            child: acceptingId == r.id
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Accepter'),
                          ),
                        ),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
