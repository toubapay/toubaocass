import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../api/client.dart';
import '../../api/insurance_api.dart';
import '../../models.dart';
import '../../theme.dart';

enum _Step { landing, type, scanFront, scanBack, analyzing, vehicleInfo, quotes }

const _coverageOptions = ['tiers_simple', 'tiers_collision', 'tous_risques'];
const _coverageLabel = {'tiers_simple': 'Tiers simple', 'tiers_collision': 'Tiers collision', 'tous_risques': 'Tous risques'};
const _ageBrackets = ['under_5', 'from_5_to_10', 'over_10'];
const _ageBracketLabel = {'under_5': 'Moins de 5 ans', 'from_5_to_10': '5 à 10 ans', 'over_10': 'Plus de 10 ans'};

class InsuranceScreen extends StatefulWidget {
  const InsuranceScreen({super.key, required this.onPurchased});

  final VoidCallback onPurchased;

  @override
  State<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends State<InsuranceScreen> {
  _Step step = _Step.landing;
  String category = 'car'; // car | motorcycle
  XFile? frontFile;
  String? scanError;

  final makeController = TextEditingController();
  final modelController = TextEditingController();
  final plateController = TextEditingController();
  final powerController = TextEditingController();
  final seatsController = TextEditingController();
  String ageBracket = 'under_5';
  String usageType = 'personal';
  String? cartePathFront;
  String? cartePathBack;

  String coverageType = 'tiers_simple';
  List<InsuranceQuote> quotes = [];
  bool loadingQuotes = false;
  int? purchasingIndex;
  String? error;

  @override
  void dispose() {
    makeController.dispose();
    modelController.dispose();
    plateController.dispose();
    powerController.dispose();
    seatsController.dispose();
    super.dispose();
  }

  Future<void> _runScan(XFile front, XFile? back) async {
    setState(() {
      step = _Step.analyzing;
      scanError = null;
    });
    try {
      final info = await scanVehicleDocument(frontPath: front.path, backPath: back?.path);
      setState(() {
        makeController.text = info.make ?? '';
        modelController.text = info.model ?? '';
        plateController.text = info.plateNumber ?? '';
        powerController.text = info.powerCv?.toString() ?? '';
        seatsController.text = info.seats?.toString() ?? '';
        ageBracket = info.vehicleAgeBracket ?? 'under_5';
        cartePathFront = info.carteGriseFrontPath;
        cartePathBack = info.carteGriseBackPath;
        step = _Step.vehicleInfo;
      });
    } catch (e) {
      setState(() {
        scanError = extractErrorMessage(e);
        step = _Step.vehicleInfo;
      });
    }
  }

  Future<XFile?> _pickFromCamera() async {
    try {
      return await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadQuotes(String coverage) async {
    setState(() {
      loadingQuotes = true;
      quotes = [];
      error = null;
    });
    try {
      final result = await quoteVehicleInsurance(
        vehicleCategory: category,
        vehiclePowerCv: int.tryParse(powerController.text),
        vehicleSeats: int.tryParse(seatsController.text),
        vehicleAgeBracket: ageBracket,
        vehicleUsageType: usageType,
        coverageType: coverage,
      );
      setState(() => quotes = result);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => loadingQuotes = false);
    }
  }

  Future<void> _purchase(InsuranceQuote quote, int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${quote.providerName} — ${quote.planName}'),
        content: Text('${quote.annualPremium} FCFA / an'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Souscrire')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      purchasingIndex = index;
      error = null;
    });
    try {
      await purchaseVehicleInsurance(
        vehicleCategory: category,
        make: makeController.text.trim().isEmpty ? null : makeController.text.trim(),
        model: modelController.text.trim().isEmpty ? null : modelController.text.trim(),
        plateNumber: plateController.text.trim().isEmpty ? null : plateController.text.trim(),
        vehiclePowerCv: int.tryParse(powerController.text),
        vehicleSeats: int.tryParse(seatsController.text),
        vehicleAgeBracket: ageBracket,
        vehicleUsageType: usageType,
        carteGriseFrontPath: cartePathFront,
        carteGriseBackPath: cartePathBack,
        quote: quote,
      );
      if (mounted) widget.onPurchased();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => purchasingIndex = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (step) {
      case _Step.landing:
        return Scaffold(
          appBar: AppBar(title: const Text('Assurance')),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🛡️', style: TextStyle(fontSize: 64)),
                  const SizedBox(height: AppSpacing.md),
                  const Text('Souscrire une assurance automobile et moto', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: AppSpacing.xs),
                  const Text('Couverture rapide. Meilleur prix.', style: TextStyle(fontSize: 15, color: AppColors.textMuted)),
                  const SizedBox(height: AppSpacing.lg),
                  ElevatedButton(onPressed: () => setState(() => step = _Step.type), child: const Text('Obtenir un devis')),
                ],
              ),
            ),
          ),
        );

      case _Step.type:
        return Scaffold(
          appBar: AppBar(title: const Text('Type de véhicule')),
          body: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() {
                      category = 'car';
                      step = _Step.scanFront;
                    }),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg)),
                    child: const Column(children: [Text('🚗', style: TextStyle(fontSize: 40)), SizedBox(height: 8), Text('Voiture', style: TextStyle(fontWeight: FontWeight.w700))]),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() {
                      category = 'motorcycle';
                      step = _Step.scanFront;
                    }),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg)),
                    child: const Column(children: [Text('🏍️', style: TextStyle(fontSize: 40)), SizedBox(height: 8), Text('Moto', style: TextStyle(fontWeight: FontWeight.w700))]),
                  ),
                ),
              ],
            ),
          ),
        );

      case _Step.scanFront:
      case _Step.scanBack:
        final isFront = step == _Step.scanFront;
        return Scaffold(
          appBar: AppBar(title: Text(isFront ? 'Photographiez votre carte grise' : 'Photographiez le dos de votre carte grise')),
          body: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                const Text('Placez le document bien à plat, dans un endroit lumineux.', style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: AppSpacing.lg),
                const Text('🪪', style: TextStyle(fontSize: 72)),
                const SizedBox(height: AppSpacing.lg),
                ElevatedButton(
                  onPressed: () async {
                    final file = await _pickFromCamera();
                    if (file == null) return;
                    if (isFront) {
                      setState(() {
                        frontFile = file;
                        step = _Step.scanBack;
                      });
                    } else {
                      await _runScan(frontFile!, file);
                    }
                  },
                  child: const Text('📷 Prendre une photo'),
                ),
                const SizedBox(height: AppSpacing.sm),
                OutlinedButton(
                  onPressed: () {
                    if (isFront) {
                      setState(() => step = _Step.vehicleInfo);
                    } else {
                      _runScan(frontFile!, null);
                    }
                  },
                  child: Text(isFront ? 'Saisir manuellement' : "Passer, j'ai une ancienne carte"),
                ),
              ],
            ),
          ),
        );

      case _Step.analyzing:
        return const Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Analyse en cours…', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  SizedBox(height: AppSpacing.md),
                  Text('Veuillez patienter pendant que nous récupérons les informations de votre carte grise.',
                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
                  SizedBox(height: AppSpacing.lg),
                  CircularProgressIndicator(color: AppColors.primary),
                ],
              ),
            ),
          ),
        );

      case _Step.vehicleInfo:
        return Scaffold(
          appBar: AppBar(title: const Text('Informations du véhicule')),
          body: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              if (scanError != null) Padding(padding: const EdgeInsets.only(bottom: AppSpacing.sm), child: Text(scanError!, style: const TextStyle(color: AppColors.danger, fontSize: 13.5))),
              TextField(controller: makeController, decoration: const InputDecoration(labelText: 'Marque')),
              const SizedBox(height: AppSpacing.sm),
              TextField(controller: modelController, decoration: const InputDecoration(labelText: 'Modèle')),
              const SizedBox(height: AppSpacing.sm),
              TextField(controller: plateController, decoration: const InputDecoration(labelText: 'Immatriculation')),
              const SizedBox(height: AppSpacing.sm),
              TextField(controller: powerController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Puissance (chevaux)')),
              const SizedBox(height: AppSpacing.sm),
              if (category == 'car')
                TextField(controller: seatsController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '# de places')),
              const SizedBox(height: AppSpacing.md),
              const Text('ÂGE DE VOTRE VÉHICULE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.sm,
                children: _ageBrackets
                    .map((b) => ChoiceChip(label: Text(_ageBracketLabel[b]!), selected: ageBracket == b, onSelected: (_) => setState(() => ageBracket = b)))
                    .toList(),
              ),
              const SizedBox(height: AppSpacing.md),
              const Text('USAGE DU VÉHICULE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => usageType = 'personal'),
                      style: OutlinedButton.styleFrom(backgroundColor: usageType == 'personal' ? AppColors.accentSoft : null),
                      child: const Text('Personnel'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => usageType = 'professional'),
                      style: OutlinedButton.styleFrom(backgroundColor: usageType == 'professional' ? AppColors.accentSoft : null),
                      child: const Text('Professionnel'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton(
                onPressed: () {
                  setState(() => step = _Step.quotes);
                  _loadQuotes(coverageType);
                },
                child: const Text('Suivant'),
              ),
            ],
          ),
        );

      case _Step.quotes:
        return Scaffold(
          appBar: AppBar(title: const Text('Comparer les assurances')),
          body: Column(
            children: [
              Row(
                children: _coverageOptions
                    .map((c) => Expanded(
                          child: TextButton(
                            onPressed: () {
                              setState(() => coverageType = c);
                              _loadQuotes(c);
                            },
                            child: Text(_coverageLabel[c]!, style: TextStyle(fontWeight: FontWeight.w700, color: coverageType == c ? AppColors.primary : AppColors.textMuted, fontSize: 12.5)),
                          ),
                        ))
                    .toList(),
              ),
              const Divider(height: 1),
              if (error != null) Padding(padding: const EdgeInsets.all(AppSpacing.md), child: Text(error!, style: const TextStyle(color: AppColors.danger))),
              Expanded(
                child: loadingQuotes
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : quotes.isEmpty
                        ? const Center(child: Text('Aucune offre disponible pour ce type de couverture.', style: TextStyle(color: AppColors.textMuted)))
                        : ListView.builder(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            itemCount: quotes.length,
                            itemBuilder: (context, index) {
                              final q = quotes[index];
                              return Container(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(q.providerName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                                    Text(q.planName, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                                    Text('${q.annualPremium} FCFA / an', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                                    Text('≈ ${q.monthlyPremium} FCFA / mois', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                                    const SizedBox(height: AppSpacing.sm),
                                    ...q.highlights.map((h) => Text('• $h', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted))),
                                    const SizedBox(height: AppSpacing.sm),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed: purchasingIndex != null ? null : () => _purchase(q, index),
                                        child: purchasingIndex == index
                                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                            : const Text('Choisir cette offre'),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        );
    }
  }
}
