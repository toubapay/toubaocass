import 'dart:async';

import 'package:flutter/material.dart';

import '../../api/cities_api.dart';
import '../../api/client.dart';
import '../../api/dem_legui_api.dart';
import '../../api/wallet_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/address_map_picker.dart';
import '../../widgets/city_picker.dart';

class NewDemLeguiRequestScreen extends StatefulWidget {
  const NewDemLeguiRequestScreen({super.key, required this.onCreated});

  final void Function(int requestId) onCreated;

  @override
  State<NewDemLeguiRequestScreen> createState() => _NewDemLeguiRequestScreenState();
}

class _NewDemLeguiRequestScreenState extends State<NewDemLeguiRequestScreen> {
  List<City> cities = [];
  String pickupAddress = '';
  double? pickupLat;
  double? pickupLng;
  City? destination;
  final seatsController = TextEditingController(text: '1');
  String paymentMethod = 'cash';
  int? walletBalance;

  DemLeguiQuote? quote;
  bool quoting = false;
  bool submitting = false;
  bool checkingActive = true;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    fetchCities().then((value) => setState(() => cities = value)).catchError((_) {});
    fetchWallet().then((w) => setState(() => walletBalance = w.balance)).catchError((_) {});
    // A rider may only have one active Dem Légui request at a time.
    fetchMyActiveDemLeguiRequest().then((active) {
      if (!mounted) return;
      if (active != null) {
        widget.onCreated(active.id);
      } else {
        setState(() => checkingActive = false);
      }
    }).catchError((_) {
      if (mounted) setState(() => checkingActive = false);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    seatsController.dispose();
    super.dispose();
  }

  void _requestQuote() {
    _debounce?.cancel();
    if (pickupLat == null || pickupLng == null || destination == null) {
      setState(() => quote = null);
      return;
    }
    final seats = int.tryParse(seatsController.text) ?? 1;
    setState(() => quoting = true);
    _debounce = Timer(const Duration(milliseconds: 400), () {
      quoteDemLeguiRequest(
        pickupLatitude: pickupLat!,
        pickupLongitude: pickupLng!,
        destinationCityId: destination!.id,
        seatsRequested: seats,
      ).then((q) {
        if (mounted) setState(() => quote = q);
      }).catchError((_) {
        if (mounted) setState(() => quote = null);
      }).whenComplete(() {
        if (mounted) setState(() => quoting = false);
      });
    });
  }

  bool get canSubmit =>
      pickupAddress.trim().isNotEmpty &&
      pickupLat != null &&
      pickupLng != null &&
      destination != null &&
      (int.tryParse(seatsController.text) ?? 0) > 0 &&
      quote != null;

  bool get insufficientFunds =>
      paymentMethod == 'wallet' && walletBalance != null && quote != null && walletBalance! < quote!.fareTotal;

  Future<void> _submit() async {
    if (!canSubmit) return;
    setState(() => submitting = true);
    try {
      final request = await createDemLeguiRequest(
        pickupLatitude: pickupLat!,
        pickupLongitude: pickupLng!,
        pickupAddress: pickupAddress,
        destinationCityId: destination!.id,
        seatsRequested: int.tryParse(seatsController.text) ?? 1,
        paymentMethod: paymentMethod,
      );
      widget.onCreated(request.id);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (checkingActive) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Dem Légui')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text('Une course à la demande, tout de suite.', style: TextStyle(fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.md),
          const Text('RAMASSAGE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          AddressMapPicker(
            addressLine: pickupAddress,
            onAddressLineChanged: (value) {
              setState(() => pickupAddress = value);
            },
            latitude: pickupLat,
            longitude: pickupLng,
            onLocationChanged: (lat, lng) {
              setState(() {
                pickupLat = lat;
                pickupLng = lng;
              });
              _requestQuote();
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: () async {
              final picked = await pickCity(context, cities, title: 'Destination');
              if (picked != null) {
                setState(() => destination = picked);
                _requestQuote();
              }
            },
            child: Text(destination?.name ?? 'Destination', overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: seatsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Places'),
            onChanged: (_) => _requestQuote(),
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('TARIF ESTIMÉ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.border),
            ),
            child: quoting
                ? const Text('Calcul en cours…', style: TextStyle(color: AppColors.textMuted, fontSize: 14))
                : quote != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${quote!.fareTotal} FCFA', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                          Text('${quote!.distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                        ],
                      )
                    : const Text('Placez le point de ramassage et choisissez une destination.',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('MOYEN DE PAIEMENT', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => paymentMethod = 'cash'),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: paymentMethod == 'cash' ? AppColors.accentSoft : null,
                    side: BorderSide(color: paymentMethod == 'cash' ? AppColors.primary : AppColors.border),
                  ),
                  child: const Text('💵 Espèces'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => paymentMethod = 'wallet'),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: paymentMethod == 'wallet' ? AppColors.accentSoft : null,
                    side: BorderSide(color: paymentMethod == 'wallet' ? AppColors.primary : AppColors.border),
                  ),
                  child: const Text('👛 Portefeuille'),
                ),
              ),
            ],
          ),
          if (insufficientFunds)
            const Padding(
              padding: EdgeInsets.only(top: AppSpacing.xs),
              child: Text('Solde insuffisant pour ce paiement.', style: TextStyle(color: AppColors.danger, fontSize: 12.5)),
            ),
          const SizedBox(height: AppSpacing.md),
          ElevatedButton(
            onPressed: !canSubmit || insufficientFunds || submitting ? null : _submit,
            child: submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(quote != null ? 'Commander — ${quote!.fareTotal} FCFA' : 'Commander'),
          ),
        ],
      ),
    );
  }
}
