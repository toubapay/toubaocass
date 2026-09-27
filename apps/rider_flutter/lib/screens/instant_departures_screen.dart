import 'dart:async';

import 'package:flutter/material.dart';

import '../api/trips_api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/trip_card.dart';

const _pollInterval = Duration(seconds: 20);

class InstantDeparturesScreen extends StatefulWidget {
  const InstantDeparturesScreen({super.key, required this.onOpenTrip});

  final void Function(int tripId) onOpenTrip;

  @override
  State<InstantDeparturesScreen> createState() => _InstantDeparturesScreenState();
}

class _InstantDeparturesScreenState extends State<InstantDeparturesScreen> {
  List<Trip> _trips = [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _load({bool silent = false}) {
    fetchInstantTrips().then((trips) {
      if (mounted) setState(() => _trips = trips);
    }).whenComplete(() {
      if (!silent && mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Départs immédiats')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _trips.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Text('Aucun départ immédiat pour le moment.', style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
                )
              : ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: _trips
                      .map((trip) => TripCard(
                            trip: trip,
                            onTap: () => widget.onOpenTrip(trip.id),
                            onTripUpdated: (updated) => setState(
                              () => _trips = _trips.map((t) => t.id == updated.id ? updated : t).toList(),
                            ),
                          ))
                      .toList(),
                ),
    );
  }
}
