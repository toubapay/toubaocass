import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../api/deliveries_api.dart';
import '../../api/wallet_api.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';
import '../../widgets/address_map_picker.dart';

const _packageTypes = ['document', 'colis_leger', 'colis_moyen', 'colis_volumineux'];
const _packageLabel = {
  'document': 'Document',
  'colis_leger': 'Colis léger (< 5 kg)',
  'colis_moyen': 'Colis moyen (5–15 kg)',
  'colis_volumineux': 'Colis volumineux (> 15 kg)',
};

class NewDeliveryScreen extends StatefulWidget {
  const NewDeliveryScreen({super.key, this.deliveryId, required this.onSaved});

  final int? deliveryId;
  final void Function(int deliveryId) onSaved;

  @override
  State<NewDeliveryScreen> createState() => _NewDeliveryScreenState();
}

class _NewDeliveryScreenState extends State<NewDeliveryScreen> {
  bool get isEditing => widget.deliveryId != null;
  int tab = 0; // 0 = sender, 1 = receiver

  bool loadingExisting = true;
  String? loadError;

  String pickupAddress = '';
  double? pickupLat;
  double? pickupLng;

  final receiverNameController = TextEditingController();
  final receiverPhoneController = TextEditingController();
  String receiverAddress = '';
  double? receiverLat;
  double? receiverLng;

  String packageType = 'colis_leger';
  final notesController = TextEditingController();
  String paymentMethod = 'cash';
  int? walletBalance;

  DeliveryQuote? quote;
  bool quoting = false;
  bool submitting = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    fetchWallet().then((w) => setState(() => walletBalance = w.balance)).catchError((_) {});
    if (isEditing) {
      fetchDelivery(widget.deliveryId!).then((d) {
        if (d.status != 'pending') {
          setState(() => loadError = 'Cette livraison ne peut plus être modifiée.');
          return;
        }
        setState(() {
          pickupAddress = d.pickupAddressLine;
          pickupLat = d.pickupLatitude;
          pickupLng = d.pickupLongitude;
          receiverNameController.text = d.receiverName;
          receiverPhoneController.text = d.receiverPhone;
          receiverAddress = d.receiverAddressLine;
          receiverLat = d.receiverLatitude;
          receiverLng = d.receiverLongitude;
          packageType = d.packageType;
          notesController.text = d.notes ?? '';
          paymentMethod = d.paymentMethod;
        });
        _requestQuote();
      }).catchError((e) {
        setState(() => loadError = extractErrorMessage(e));
      }).whenComplete(() {
        if (mounted) setState(() => loadingExisting = false);
      });
    } else {
      loadingExisting = false;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    receiverNameController.dispose();
    receiverPhoneController.dispose();
    notesController.dispose();
    super.dispose();
  }

  void _requestQuote() {
    _debounce?.cancel();
    if (pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) {
      setState(() => quote = null);
      return;
    }
    setState(() => quoting = true);
    _debounce = Timer(const Duration(milliseconds: 400), () {
      quoteDelivery(pickupLatitude: pickupLat!, pickupLongitude: pickupLng!, receiverLatitude: receiverLat!, receiverLongitude: receiverLng!)
          .then((q) {
        if (mounted) setState(() => quote = q);
      }).catchError((_) {
        if (mounted) setState(() => quote = null);
      }).whenComplete(() {
        if (mounted) setState(() => quoting = false);
      });
    });
  }

  bool get senderComplete => pickupAddress.trim().isNotEmpty && pickupLat != null && pickupLng != null;
  bool get receiverComplete =>
      receiverNameController.text.trim().isNotEmpty &&
      receiverPhoneController.text.trim().isNotEmpty &&
      receiverAddress.trim().isNotEmpty &&
      receiverLat != null &&
      receiverLng != null;

  bool get canSubmit => senderComplete && receiverComplete && quote != null;
  bool get insufficientFunds => paymentMethod == 'wallet' && walletBalance != null && quote != null && walletBalance! < quote!.fee;

  Future<void> _submit() async {
    if (!canSubmit) return;
    setState(() => submitting = true);
    try {
      final delivery = isEditing
          ? await updateDelivery(
              widget.deliveryId!,
              receiverName: receiverNameController.text.trim(),
              receiverPhone: receiverPhoneController.text.trim(),
              receiverAddressLine: receiverAddress,
              receiverLatitude: receiverLat!,
              receiverLongitude: receiverLng!,
              pickupAddressLine: pickupAddress,
              pickupLatitude: pickupLat!,
              pickupLongitude: pickupLng!,
              packageType: packageType,
              notes: notesController.text.trim(),
              paymentMethod: paymentMethod,
            )
          : await createDelivery(
              receiverName: receiverNameController.text.trim(),
              receiverPhone: receiverPhoneController.text.trim(),
              receiverAddressLine: receiverAddress,
              receiverLatitude: receiverLat!,
              receiverLongitude: receiverLng!,
              pickupAddressLine: pickupAddress,
              pickupLatitude: pickupLat!,
              pickupLongitude: pickupLng!,
              packageType: packageType,
              notes: notesController.text.trim(),
              paymentMethod: paymentMethod,
            );
      widget.onSaved(delivery.id);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loadingExisting) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    if (loadError != null) {
      return Scaffold(appBar: AppBar(title: const Text('Livraison')), body: Center(child: Text(loadError!, style: const TextStyle(color: AppColors.danger))));
    }
    final user = context.read<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(title: Text(isEditing ? 'Modifier la livraison' : 'Nouvelle livraison')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => setState(() => tab = 0),
                  child: Text('${senderComplete ? '✓ ' : ''}Expéditeur', style: TextStyle(fontWeight: FontWeight.w700, color: tab == 0 ? AppColors.primary : AppColors.textMuted)),
                ),
              ),
              Expanded(
                child: TextButton(
                  onPressed: () => setState(() => tab = 1),
                  child: Text('${receiverComplete ? '✓ ' : ''}Destinataire', style: TextStyle(fontWeight: FontWeight.w700, color: tab == 1 ? AppColors.primary : AppColors.textMuted)),
                ),
              ),
            ],
          ),
          const Divider(),
          if (tab == 0) ...[
            const Text('EXPÉDITEUR', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  Text(user?.phone ?? '', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                ],
              ),
            ),
            const Text('ADRESSE DE RAMASSAGE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
            AddressMapPicker(
              addressLine: pickupAddress,
              onAddressLineChanged: (v) => setState(() => pickupAddress = v),
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
            OutlinedButton(onPressed: () => setState(() => tab = 1), child: const Text('Étape suivante')),
          ] else ...[
            const Text('DESTINATAIRE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
            TextField(controller: receiverNameController, decoration: const InputDecoration(labelText: 'Nom du destinataire'), onChanged: (_) => setState(() {})),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: receiverPhoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Téléphone du destinataire'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: AppSpacing.sm),
            const Text('ADRESSE DE LIVRAISON', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
            AddressMapPicker(
              addressLine: receiverAddress,
              onAddressLineChanged: (v) => setState(() => receiverAddress = v),
              latitude: receiverLat,
              longitude: receiverLng,
              onLocationChanged: (lat, lng) {
                setState(() {
                  receiverLat = lat;
                  receiverLng = lng;
                });
                _requestQuote();
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            const Text('TYPE DE COLIS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: _packageTypes
                  .map((pt) => ChoiceChip(
                        label: Text(_packageLabel[pt]!),
                        selected: packageType == pt,
                        onSelected: (_) => setState(() => packageType = pt),
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: notesController, decoration: const InputDecoration(labelText: 'Remarques (facultatif)')),
          const SizedBox(height: AppSpacing.md),
          const Text('FRAIS ESTIMÉS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: quoting
                ? const Text('Calcul en cours…', style: TextStyle(color: AppColors.textMuted))
                : quote != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${quote!.fee} FCFA', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                          Text('${quote!.distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                        ],
                      )
                    : const Text('Placez les adresses de ramassage et de livraison.', style: TextStyle(color: AppColors.textMuted)),
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('MOYEN DE PAIEMENT', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => paymentMethod = 'cash'),
                  style: OutlinedButton.styleFrom(backgroundColor: paymentMethod == 'cash' ? AppColors.accentSoft : null),
                  child: const Text('💵 Espèces'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => paymentMethod = 'wallet'),
                  style: OutlinedButton.styleFrom(backgroundColor: paymentMethod == 'wallet' ? AppColors.accentSoft : null),
                  child: const Text('👛 Portefeuille'),
                ),
              ),
            ],
          ),
          if (insufficientFunds)
            const Padding(padding: EdgeInsets.only(top: 4), child: Text('Solde insuffisant pour ce paiement.', style: TextStyle(color: AppColors.danger, fontSize: 12.5))),
          const SizedBox(height: AppSpacing.md),
          ElevatedButton(
            onPressed: !canSubmit || insufficientFunds || submitting ? null : _submit,
            child: submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(isEditing ? 'Enregistrer les modifications' : (quote != null ? 'Envoyer — ${quote!.fee} FCFA' : 'Envoyer')),
          ),
        ],
      ),
    );
  }
}
