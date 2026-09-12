import 'package:flutter/material.dart';

import '../../api/insurance_api.dart';
import '../../models.dart';
import '../../theme.dart';

const _coverageLabel = {'tiers_simple': 'Tiers simple', 'tiers_collision': 'Tiers collision', 'tous_risques': 'Tous risques'};

class MyPoliciesScreen extends StatefulWidget {
  const MyPoliciesScreen({super.key});

  @override
  State<MyPoliciesScreen> createState() => _MyPoliciesScreenState();
}

class _MyPoliciesScreenState extends State<MyPoliciesScreen> {
  List<InsurancePolicy> policies = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchMyPolicies();
      setState(() => policies = result.data);
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes assurances')),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  if (policies.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                      child: Center(child: Text('Aucune assurance souscrite pour le moment.', style: TextStyle(color: AppColors.textMuted, fontSize: 16))),
                    )
                  else
                    ...policies.map((p) => Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          margin: const EdgeInsets.only(bottom: AppSpacing.md),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(p.providerName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(color: p.isActive ? AppColors.successSoft : AppColors.background, borderRadius: BorderRadius.circular(999)),
                                    child: Text(p.isActive ? 'Active' : (p.status == 'expired' ? 'Expirée' : 'Annulée'),
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.isActive ? AppColors.success : AppColors.textMuted)),
                                  ),
                                ],
                              ),
                              Text('${p.car.make ?? ''} ${p.car.model ?? ''} (${p.car.plateNumber ?? ''})', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                              Text('${p.planName} · ${_coverageLabel[p.coverageType] ?? p.coverageType}', style: const TextStyle(fontSize: 14)),
                              Text('${p.annualPremium} FCFA / an', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
                              Text('Valide du ${p.startsAt} au ${p.endsAt}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              Text('N° ${p.policyNumber}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontFamily: 'monospace')),
                            ],
                          ),
                        )),
                ],
              ),
            ),
    );
  }
}
