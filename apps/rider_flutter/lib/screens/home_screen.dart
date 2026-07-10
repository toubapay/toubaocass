import 'package:flutter/material.dart';

import '../api/cities_api.dart';
import '../api/trips_api.dart';
import '../models.dart';
import '../push/push_service.dart';
import '../theme.dart';
import '../utils/my_location.dart';
import '../widgets/city_picker.dart';
import '../widgets/trip_card.dart';
import '../widgets/trips_map.dart';

const _nearbyRadiusKm = 25.0;

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onOpenTrip});

  final void Function(int tripId) onOpenTrip;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<City> cities = [];
  City? origin;
  City? destination;
  DateTime? date;
  int seats = 1;
  Coordinates? nearMe;
  bool locating = false;

  List<Trip> trips = [];
  bool loading = true;
  String? error;
  final searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    fetchCities().then((value) => setState(() => cities = value)).catchError((_) {});
    _load();
    registerPushToken();
  }

  bool get hasFilters => origin != null || destination != null || date != null || nearMe != null;
  bool get invalidRoute => origin != null && destination != null && origin!.id == destination!.id;

  Future<void> _load() async {
    if (invalidRoute) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await searchTrips(
        originCityId: origin?.id,
        destinationCityId: destination?.id,
        date: date?.toIso8601String().substring(0, 10),
        seats: seats,
        lat: nearMe?.latitude,
        lng: nearMe?.longitude,
        radiusKm: nearMe != null ? _nearbyRadiusKm : null,
      );
      setState(() => trips = result.data);
    } catch (_) {
      setState(() => error = 'Impossible de charger les trajets. Tirez pour actualiser.');
    } finally {
      setState(() => loading = false);
    }
  }

  void _clearFilters() {
    setState(() {
      origin = null;
      destination = null;
      date = null;
      nearMe = null;
    });
    _load();
  }

  Future<void> _toggleNearMe() async {
    if (nearMe != null) {
      setState(() => nearMe = null);
      _load();
      return;
    }
    setState(() => locating = true);
    try {
      final coords = await requestMyLocation();
      setState(() => nearMe = coords);
      _load();
    } on LocationRequestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      setState(() => locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = searchController.text.trim().toLowerCase();
    final visibleTrips = query.isEmpty
        ? trips
        : trips
            .where((t) =>
                '${t.originCity?.name ?? ''} ${t.destinationCity?.name ?? ''}'.toLowerCase().contains(query))
            .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Trajets disponibles')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            TextField(
              controller: searchController,
              decoration: const InputDecoration(
                hintText: "Rechercher une ville de départ ou d'arrivée...",
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: locating ? null : _toggleNearMe,
              style: OutlinedButton.styleFrom(
                backgroundColor: nearMe != null ? AppColors.primary : null,
                foregroundColor: nearMe != null ? Colors.white : AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: locating
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(nearMe != null
                      ? '📍 Trajets affichés dans un rayon de ${_nearbyRadiusKm.toStringAsFixed(0)} km'
                      : '📍 Trouver des trajets près de moi'),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final picked = await pickCity(context, cities, title: 'Départ');
                      if (picked != null) {
                        setState(() => origin = picked);
                        _load();
                      }
                    },
                    child: Text(origin?.name ?? 'Départ : toutes les villes', overflow: TextOverflow.ellipsis),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final picked = await pickCity(context, cities, title: 'Arrivée');
                      if (picked != null) {
                        setState(() => destination = picked);
                        _load();
                      }
                    },
                    child: Text(destination?.name ?? 'Arrivée : toutes les villes', overflow: TextOverflow.ellipsis),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: date ?? DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => date = picked);
                        _load();
                      }
                    },
                    child: Text(date != null ? date!.toIso8601String().substring(0, 10) : 'Toutes les dates'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                  height: 46,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove, size: 18),
                        onPressed: () {
                          setState(() => seats = (seats - 1).clamp(1, 9));
                          _load();
                        },
                      ),
                      Text('$seats', style: const TextStyle(fontWeight: FontWeight.w700)),
                      IconButton(
                        icon: const Icon(Icons.add, size: 18),
                        onPressed: () {
                          setState(() => seats = (seats + 1).clamp(1, 9));
                          _load();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (hasFilters)
              TextButton(
                onPressed: _clearFilters,
                child: const Text('Effacer les filtres'),
              ),
            if (invalidRoute)
              const Padding(
                padding: EdgeInsets.only(bottom: AppSpacing.sm),
                child: Text(
                  "La ville de départ et d'arrivée ne peuvent pas être identiques.",
                  style: TextStyle(color: AppColors.danger, fontSize: 13),
                ),
              ),
            const SizedBox(height: AppSpacing.sm),
            if (loading && trips.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              )
            else ...[
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ),
              if (visibleTrips.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Center(
                    child: Text(
                      query.isNotEmpty
                          ? 'Aucun trajet ne correspond à "${searchController.text.trim()}".'
                          : nearMe != null
                              ? 'Aucun trajet ne part dans un rayon de ${_nearbyRadiusKm.toStringAsFixed(0)} km pour l\'instant.'
                              : hasFilters
                                  ? "Aucun trajet trouvé pour ces filtres. Essayez d'élargir votre recherche."
                                  : 'Aucun trajet à venir pour le moment — revenez bientôt.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 15),
                    ),
                  ),
                )
              else
                ...visibleTrips.map((trip) => TripCard(
                      trip: trip,
                      onTap: () => widget.onOpenTrip(trip.id),
                      onTripUpdated: (updated) => setState(
                        () => trips = trips.map((t) => t.id == updated.id ? updated : t).toList(),
                      ),
                    )),
              const SizedBox(height: AppSpacing.md),
              TripsMap(trips: visibleTrips, onSelectTrip: widget.onOpenTrip),
            ],
          ],
        ),
      ),
    );
  }
}
