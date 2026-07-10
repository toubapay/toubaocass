import 'package:flutter/material.dart';

import '../../api/cars_api.dart';
import '../../api/client.dart';
import '../../models.dart';
import '../../theme.dart';

class CarsListScreen extends StatefulWidget {
  const CarsListScreen({super.key, required this.onAddCar});

  final VoidCallback onAddCar;

  @override
  State<CarsListScreen> createState() => _CarsListScreenState();
}

class _CarsListScreenState extends State<CarsListScreen> {
  List<Car> cars = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyCars();
      setState(() => cars = result);
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _handleDelete(Car car) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le véhicule'),
        content: Text('Supprimer ${car.make} ${car.model} (${car.plateNumber}) ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await deleteCar(car.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes véhicules')),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  if (cars.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                      child: Center(
                        child: Text('Ajoutez un véhicule pour commencer à publier des trajets.',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 15), textAlign: TextAlign.center),
                      ),
                    )
                  else
                    ...cars.map((car) => Container(
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
                              Text('${car.make} ${car.model} (${car.year ?? 'N/A'})',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              Text('${car.plateNumber} · ${car.seats} places · ${car.type.toUpperCase()}',
                                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                              TextButton(
                                onPressed: () => _handleDelete(car),
                                style: TextButton.styleFrom(foregroundColor: AppColors.danger, padding: EdgeInsets.zero),
                                child: const Text('Supprimer'),
                              ),
                            ],
                          ),
                        )),
                  ElevatedButton(onPressed: widget.onAddCar, child: const Text('Ajouter un véhicule')),
                ],
              ),
            ),
    );
  }
}
