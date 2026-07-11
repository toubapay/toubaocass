import 'package:flutter/material.dart';

import '../../api/cars_api.dart';
import '../../api/client.dart';
import '../../theme.dart';

const _carTypes = [
  ('sedan', 'Berline'),
  ('suv', 'SUV'),
  ('van', 'Fourgonnette'),
  ('minibus', 'Minibus'),
];

class AddCarScreen extends StatefulWidget {
  const AddCarScreen({super.key, required this.onSaved});

  final VoidCallback onSaved;

  @override
  State<AddCarScreen> createState() => _AddCarScreenState();
}

class _AddCarScreenState extends State<AddCarScreen> {
  String type = 'sedan';
  final makeController = TextEditingController();
  final modelController = TextEditingController();
  final yearController = TextEditingController();
  final colorController = TextEditingController();
  final plateController = TextEditingController();
  final seatsController = TextEditingController(text: '4');
  bool loading = false;
  String? error;

  bool get canSubmit =>
      makeController.text.trim().isNotEmpty &&
      modelController.text.trim().isNotEmpty &&
      plateController.text.trim().isNotEmpty &&
      (int.tryParse(seatsController.text) ?? 0) > 0;

  Future<void> _submit() async {
    setState(() {
      error = null;
      loading = true;
    });
    try {
      await createCar(
        type: type,
        make: makeController.text.trim(),
        model: modelController.text.trim(),
        year: yearController.text.trim().isEmpty ? null : int.tryParse(yearController.text.trim()),
        color: colorController.text.trim().isEmpty ? null : colorController.text.trim(),
        plateNumber: plateController.text.trim(),
        seats: int.parse(seatsController.text.trim()),
      );
      widget.onSaved();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ajouter un véhicule')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text('Type de véhicule', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: _carTypes
                .map((t) => ChoiceChip(
                      label: Text(t.$2),
                      selected: type == t.$1,
                      onSelected: (_) => setState(() => type = t.$1),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: type == t.$1 ? Colors.white : AppColors.text),
                    ))
                .toList(),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: makeController, decoration: const InputDecoration(labelText: 'Marque', hintText: 'Toyota'), onChanged: (_) => setState(() {})),
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: modelController, decoration: const InputDecoration(labelText: 'Modèle', hintText: 'Corolla'), onChanged: (_) => setState(() {})),
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: yearController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Année', hintText: '2020')),
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: colorController, decoration: const InputDecoration(labelText: 'Couleur', hintText: 'Blanc')),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: plateController,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(labelText: "Numéro d'immatriculation", hintText: 'DK-1234-AB', errorText: error),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: seatsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Nombre de places (passagers)'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.md),
          ElevatedButton(
            onPressed: canSubmit && !loading ? _submit : null,
            child: loading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Enregistrer le véhicule'),
          ),
        ],
      ),
    );
  }
}
