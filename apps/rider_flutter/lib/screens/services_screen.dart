import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/module_status_provider.dart';
import '../theme.dart';

class _ServiceEntry {
  final String key;
  final String icon;
  final String label;
  final String description;
  final VoidCallback onTap;

  _ServiceEntry({required this.key, required this.icon, required this.label, required this.description, required this.onTap});
}

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key, required this.onOpenDemLegui, required this.onOpenAnando, required this.onOpenLivraison});

  final VoidCallback onOpenDemLegui;
  final VoidCallback onOpenAnando;
  final VoidCallback onOpenLivraison;

  @override
  Widget build(BuildContext context) {
    final moduleStatus = context.watch<ModuleStatusProvider>();

    final services = [
      _ServiceEntry(
        key: 'dem_legui',
        icon: '🚕',
        label: 'Dem Légui',
        description: 'Une course à la demande, tout de suite',
        onTap: onOpenDemLegui,
      ),
      _ServiceEntry(
        key: 'anando',
        icon: '🚗',
        label: 'Anando',
        description: 'Covoiturage instantané',
        onTap: onOpenAnando,
      ),
      _ServiceEntry(
        key: 'livraison',
        icon: '📦',
        label: 'Livraison',
        description: 'Envoyer un colis',
        onTap: onOpenLivraison,
      ),
    ].where((s) => moduleStatus.isEnabled(s.key)).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Services')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: services
            .map((s) => InkWell(
                  onTap: s.onTap,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    margin: const EdgeInsets.only(bottom: AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(AppRadius.md)),
                          child: Text(s.icon, style: const TextStyle(fontSize: 22)),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(s.label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              Text(s.description, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}
