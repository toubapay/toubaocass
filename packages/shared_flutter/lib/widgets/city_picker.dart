import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';

Future<City?> pickCity(BuildContext context, List<City> cities, {String title = 'Choisir une ville'}) {
  return showModalBottomSheet<City>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    builder: (context) => _CityPickerSheet(cities: cities, title: title),
  );
}

class _CityPickerSheet extends StatefulWidget {
  const _CityPickerSheet({required this.cities, required this.title});

  final List<City> cities;
  final String title;

  @override
  State<_CityPickerSheet> createState() => _CityPickerSheetState();
}

class _CityPickerSheetState extends State<_CityPickerSheet> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.cities.where((c) => c.name.toLowerCase().contains(query.toLowerCase())).toList();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Rechercher une ville'),
              onChanged: (value) => setState(() => query = value),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              height: 320,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final city = filtered[index];
                  return ListTile(
                    title: Text(city.name),
                    subtitle: Text(city.country),
                    onTap: () => Navigator.of(context).pop(city),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
