import 'package:flutter/material.dart';

import '../../api/anando_api.dart';
import '../../api/cities_api.dart';
import '../../api/client.dart';
import '../../api/trips_api.dart' show Paginated;
import '../../models.dart';
import '../../theme.dart';

const _activeRideStatuses = {'open', 'full', 'in_progress'};

const _statusLabel = {
  'open': 'Disponible',
  'full': 'Complet',
  'in_progress': 'En cours',
  'cancelled': 'Annulé',
  'completed': 'Terminé',
};

class AnandoScreen extends StatefulWidget {
  const AnandoScreen({super.key, required this.onOpenRide});

  final void Function(int rideId) onOpenRide;

  @override
  State<AnandoScreen> createState() => _AnandoScreenState();
}

class _AnandoScreenState extends State<AnandoScreen> {
  int tab = 0; // 0 = available, 1 = mine
  List<City> cities = [];
  List<AnandoRide> rides = [];
  List<AnandoRide> myRides = [];
  List<AnandoRideBooking> myBookings = [];
  bool loading = true;

  City? origin;
  City? destination;
  final departureController = TextEditingController();
  final priceController = TextEditingController();
  final seatsController = TextEditingController(text: '3');
  bool posting = false;
  String? error;
  bool rideActionLoading = false;

  AnandoRide? get activeRide {
    for (final ride in myRides) {
      if (_activeRideStatuses.contains(ride.status) && !isAnandoRideStale(ride)) return ride;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    fetchCities().then((value) => setState(() => cities = value)).catchError((_) {});
    _load();
  }

  @override
  void dispose() {
    departureController.dispose();
    priceController.dispose();
    seatsController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([fetchAnandoRides(), fetchMyAnandoRides(), fetchMyAnandoBookings()]);
      setState(() {
        rides = (results[0] as Paginated<AnandoRide>).data.where((r) => !isAnandoRideStale(r)).toList();
        myRides = (results[1] as Paginated<AnandoRide>).data;
        myBookings = (results[2] as Paginated<AnandoRideBooking>).data;
      });
    } finally {
      setState(() => loading = false);
    }
  }

  bool get canSubmit =>
      origin != null &&
      destination != null &&
      origin!.id != destination!.id &&
      (int.tryParse(priceController.text) ?? 0) > 0 &&
      (int.tryParse(seatsController.text) ?? 0) > 0;

  Future<void> _submitPost() async {
    if (!canSubmit) return;
    setState(() {
      posting = true;
      error = null;
    });
    try {
      final ride = await postAnandoRide(
        originCityId: origin!.id,
        destinationCityId: destination!.id,
        departurePoint: departureController.text.trim().isEmpty ? null : departureController.text.trim(),
        pricePerSeat: int.parse(priceController.text),
        totalSeats: int.parse(seatsController.text),
      );
      setState(() {
        origin = null;
        destination = null;
        departureController.clear();
        priceController.clear();
        seatsController.text = '3';
      });
      if (mounted) widget.onOpenRide(ride.id);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => posting = false);
    }
  }

  Future<void> _runRideAction(Future<AnandoRide> Function() action) async {
    setState(() {
      rideActionLoading = true;
      error = null;
    });
    try {
      await action();
      await _load();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => rideActionLoading = false);
    }
  }

  Widget _rideCard(AnandoRide ride) {
    return InkWell(
      onTap: () => widget.onOpenRide(ride.id),
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
                  child: Text('${ride.originCity?.name ?? '?'} → ${ride.destinationCity?.name ?? '?'}',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                ),
                Text(_statusLabel[ride.status] ?? ride.status,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ride.status == 'open' ? AppColors.success : AppColors.accent)),
              ],
            ),
            Text('${ride.poster.name ?? ''} · ${ride.availableSeats} place(s) disponible(s)',
                style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
            if (ride.departurePoint != null) Text('📍 ${ride.departurePoint}', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
            Text('${ride.pricePerSeat} FCFA / place', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ride = activeRide;

    return Scaffold(
      appBar: AppBar(title: const Text('Anando')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            const Text('Partagez un trajet instantané ou rejoignez celui de quelqu\'un d\'autre.',
                style: TextStyle(fontSize: 14, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.md),
            if (ride != null)
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.primary, width: 2),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TRAJET ANANDO EN COURS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                    const SizedBox(height: AppSpacing.xs),
                    Text('${ride.originCity?.name ?? '?'} → ${ride.destinationCity?.name ?? '?'}',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    Text('${ride.totalSeats - ride.availableSeats}/${ride.totalSeats} places réservées',
                        style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                    if (error != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        if (ride.status == 'open' || ride.status == 'full')
                          Expanded(
                            child: ElevatedButton(
                              onPressed: rideActionLoading ? null : () => _runRideAction(() => startAnandoRide(ride.id)),
                              child: const Text('Démarrer'),
                            ),
                          ),
                        if (ride.status == 'in_progress')
                          Expanded(
                            child: ElevatedButton(
                              onPressed: rideActionLoading ? null : () => _runRideAction(() => completeAnandoRide(ride.id)),
                              child: const Text('Terminer'),
                            ),
                          ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(onPressed: () => widget.onOpenRide(ride.id), child: const Text('Détails')),
                        ),
                      ],
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('PUBLIER UN TRAJET ANANDO', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () async {
                              final picked = await _pickCity('Départ');
                              if (picked != null) setState(() => origin = picked);
                            },
                            child: Text(origin?.name ?? 'Départ', overflow: TextOverflow.ellipsis),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () async {
                              final picked = await _pickCity('Arrivée');
                              if (picked != null) setState(() => destination = picked);
                            },
                            child: Text(destination?.name ?? 'Arrivée', overflow: TextOverflow.ellipsis),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextField(controller: departureController, decoration: const InputDecoration(labelText: 'Point de départ (facultatif)')),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: priceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Prix par place'),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextField(
                            controller: seatsController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Places'),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                      ],
                    ),
                    if (error != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
                    const SizedBox(height: AppSpacing.sm),
                    ElevatedButton(
                      onPressed: !canSubmit || posting ? null : _submitPost,
                      child: posting
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Publier mon trajet Anando'),
                    ),
                  ],
                ),
              ),
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
                    child: Text('Mes trajets', style: TextStyle(fontWeight: FontWeight.w700, color: tab == 1 ? AppColors.primary : AppColors.textMuted)),
                  ),
                ),
              ],
            ),
            const Divider(),
            if (loading)
              const Padding(padding: EdgeInsets.symmetric(vertical: AppSpacing.lg), child: Center(child: CircularProgressIndicator(color: AppColors.primary)))
            else if (tab == 0)
              rides.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                      child: Text('Aucun trajet Anando disponible pour l\'instant.', style: TextStyle(color: AppColors.textMuted)),
                    )
                  : Column(children: rides.map(_rideCard).toList())
            else ...[
              const Text('MES TRAJETS PUBLIÉS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              myRides.isEmpty
                  ? const Padding(padding: EdgeInsets.only(bottom: AppSpacing.md), child: Text('Vous n\'avez publié aucun trajet Anando.', style: TextStyle(color: AppColors.textMuted)))
                  : Column(children: myRides.map(_rideCard).toList()),
              const SizedBox(height: AppSpacing.md),
              const Text('MES RÉSERVATIONS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              myBookings.isEmpty
                  ? const Text('Vous n\'avez rejoint aucun trajet Anando.', style: TextStyle(color: AppColors.textMuted))
                  : Column(children: myBookings.map((b) => _rideCard(b.anandoRide)).toList()),
            ],
          ],
        ),
      ),
    );
  }

  Future<City?> _pickCity(String title) {
    return showModalBottomSheet<City>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Column(
            children: [
              Padding(padding: const EdgeInsets.all(AppSpacing.md), child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              Expanded(
                child: ListView(
                  children: cities
                      .map((c) => ListTile(title: Text(c.name), onTap: () => Navigator.of(context).pop(c)))
                      .toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
