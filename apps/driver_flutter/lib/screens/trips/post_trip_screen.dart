import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/cars_api.dart';
import '../../api/cities_api.dart';
import '../../api/client.dart';
import '../../api/trips_api.dart';
import '../../models.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';
import '../../widgets/city_picker.dart';
import '../../widgets/departure_picker.dart';

const _rideTypes = [
  ('standard', 'Standard'),
  ('comfort', 'Confort'),
  ('xl', 'XL'),
];

class PostTripScreen extends StatefulWidget {
  const PostTripScreen({super.key, required this.onCreated});

  final VoidCallback onCreated;

  @override
  State<PostTripScreen> createState() => _PostTripScreenState();
}

class _PostTripScreenState extends State<PostTripScreen> {
  List<Car> cars = [];
  List<City> cities = [];
  bool loadingData = true;

  Car? car;
  City? origin;
  City? destination;
  DateTime? date;
  TimeOfDay? time;
  double? departureLat;
  double? departureLng;
  final departureAddressController = TextEditingController();
  final fareController = TextEditingController();
  String rideType = 'standard';
  final notesController = TextEditingController();
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    Future.wait([fetchMyCars(), fetchCities()]).then((results) {
      setState(() {
        cars = results[0] as List<Car>;
        cities = results[1] as List<City>;
        if (cars.isNotEmpty) car = cars.first;
      });
    }).whenComplete(() => setState(() => loadingData = false));
  }

  bool get kycApproved => context.read<AuthProvider>().user?.driverProfile?.kycStatus == 'approved';

  bool get canSubmit =>
      car != null &&
      origin != null &&
      destination != null &&
      origin!.id != destination!.id &&
      date != null &&
      time != null &&
      (int.tryParse(fareController.text) ?? 0) > 0;

  Future<void> _submit() async {
    if (!canSubmit) return;
    setState(() {
      error = null;
      loading = true;
    });
    try {
      await createTrip(
        carId: car!.id,
        originCityId: origin!.id,
        destinationCityId: destination!.id,
        departureLatitude: departureLat,
        departureLongitude: departureLng,
        departureAddress: departureAddressController.text.trim().isEmpty ? null : departureAddressController.text.trim(),
        departureDate: '${date!.year.toString().padLeft(4, '0')}-${date!.month.toString().padLeft(2, '0')}-${date!.day.toString().padLeft(2, '0')}',
        departureTime: '${time!.hour.toString().padLeft(2, '0')}:${time!.minute.toString().padLeft(2, '0')}',
        fare: int.parse(fareController.text.trim()),
        rideType: rideType,
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
      );
      widget.onCreated();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loadingData) {
      return Scaffold(
        appBar: AppBar(title: const Text('Publier un trajet')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (!kycApproved) {
      return Scaffold(
        appBar: AppBar(title: const Text('Publier un trajet')),
        body: const Padding(
          padding: EdgeInsets.all(AppSpacing.md),
          child: Text(
            "Votre vérification conducteur doit être approuvée avant de pouvoir publier des trajets. Consultez l'onglet Vérification.",
            style: TextStyle(color: AppColors.textMuted, fontSize: 16),
          ),
        ),
      );
    }

    if (cars.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Publier un trajet')),
        body: const Padding(
          padding: EdgeInsets.all(AppSpacing.md),
          child: Text("Ajoutez d'abord un véhicule depuis l'onglet Flotte.",
              style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Publier un trajet')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text('Véhicule', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: cars
                .map((c) => ChoiceChip(
                      label: Text('${c.make} ${c.model} (${c.seats})'),
                      selected: car?.id == c.id,
                      onSelected: (_) => setState(() => car = c),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: car?.id == c.id ? Colors.white : AppColors.text),
                    ))
                .toList(),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    final picked = await pickCity(context, cities, title: 'Ville de départ');
                    if (picked != null) setState(() => origin = picked);
                  },
                  child: Text(origin?.name ?? 'Ville de départ', overflow: TextOverflow.ellipsis),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    final picked = await pickCity(context, cities, title: 'Ville de destination');
                    if (picked != null) setState(() => destination = picked);
                  },
                  child: Text(destination?.name ?? 'Ville de destination', overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('Point de rendez-vous exact (facultatif)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          DeparturePicker(
            latitude: departureLat,
            longitude: departureLng,
            onChange: (lat, lng) => setState(() {
              departureLat = lat;
              departureLng = lng;
            }),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: departureAddressController,
            decoration: const InputDecoration(
              labelText: 'Description du point de rendez-vous',
              hintText: "ex. Station Total, Route de l'Aéroport",
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: date ?? DateTime.now(),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (picked != null) setState(() => date = picked);
            },
            child: Text(date != null
                ? '${date!.year}-${date!.month.toString().padLeft(2, '0')}-${date!.day.toString().padLeft(2, '0')}'
                : 'Date de départ'),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: () async {
              final picked = await showTimePicker(context: context, initialTime: time ?? TimeOfDay.now());
              if (picked != null) setState(() => time = picked);
            },
            child: Text(time != null ? time!.format(context) : 'Heure de départ'),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: fareController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: 'Tarif par place (FCFA)', errorText: error),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('Type de trajet', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.sm,
            children: _rideTypes
                .map((t) => ChoiceChip(
                      label: Text(t.$2),
                      selected: rideType == t.$1,
                      onSelected: (_) => setState(() => rideType = t.$1),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: rideType == t.$1 ? Colors.white : AppColors.text),
                    ))
                .toList(),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: notesController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Remarques (facultatif)'),
          ),
          const SizedBox(height: AppSpacing.md),
          ElevatedButton(
            onPressed: canSubmit && !loading ? _submit : null,
            child: loading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Publier le trajet'),
          ),
        ],
      ),
    );
  }
}
