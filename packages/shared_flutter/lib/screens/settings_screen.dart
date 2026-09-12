import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/addresses_api.dart';
import '../api/auth_api.dart' as auth_api;
import '../api/client.dart';
import '../models.dart';
import '../state/auth_provider.dart';
import '../theme.dart';
import '../widgets/address_map_picker.dart';

class _AddressForm extends StatefulWidget {
  const _AddressForm({this.initial, required this.onCancel, required this.onSaved});

  final Address? initial;
  final VoidCallback onCancel;
  final void Function(Address) onSaved;

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  late final labelController = TextEditingController(text: widget.initial?.label ?? '');
  late String addressLine = widget.initial?.addressLine ?? '';
  double? latitude;
  double? longitude;
  bool isDefault = false;
  bool saving = false;
  String? error;

  @override
  void initState() {
    super.initState();
    latitude = widget.initial?.latitude;
    longitude = widget.initial?.longitude;
    isDefault = widget.initial?.isDefault ?? false;
  }

  Future<void> _submit() async {
    setState(() {
      error = null;
      saving = true;
    });
    try {
      final address = widget.initial != null
          ? await updateAddress(
              widget.initial!.id,
              label: labelController.text.trim(),
              addressLine: addressLine.trim(),
              latitude: latitude,
              longitude: longitude,
              isDefault: isDefault,
            )
          : await createAddress(
              label: labelController.text.trim(),
              addressLine: addressLine.trim(),
              latitude: latitude,
              longitude: longitude,
              isDefault: isDefault,
            );
      widget.onSaved(address);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit = labelController.text.trim().isNotEmpty && addressLine.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: labelController,
            decoration: const InputDecoration(labelText: 'Libellé', hintText: 'Domicile, Travail…'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.sm),
          const Text('Adresse', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          AddressMapPicker(
            addressLine: addressLine,
            onAddressLineChanged: (value) => setState(() => addressLine = value),
            latitude: latitude,
            longitude: longitude,
            onLocationChanged: (lat, lng) => setState(() {
              latitude = lat;
              longitude = lng;
            }),
          ),
          CheckboxListTile(
            value: isDefault,
            onChanged: (v) => setState(() => isDefault = v ?? false),
            title: const Text('Définir comme adresse par défaut', style: TextStyle(fontSize: 14)),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          if (error != null) Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: !canSubmit || saving ? null : _submit,
                  child: saving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Enregistrer'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: OutlinedButton(onPressed: widget.onCancel, child: const Text('Annuler'))),
            ],
          ),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final nameController = TextEditingController(text: context.read<AuthProvider>().user?.name ?? '');
  late final emailController = TextEditingController(text: context.read<AuthProvider>().user?.email ?? '');
  bool savingProfile = false;
  String? profileError;
  bool profileSaved = false;

  List<Address>? addresses;
  Object? formOpen; // 'new', an Address id (int), or null

  @override
  void initState() {
    super.initState();
    fetchAddresses().then((value) => setState(() => addresses = value)).catchError((_) {
      setState(() => addresses = []);
    });
  }

  Future<void> _saveProfile() async {
    setState(() {
      profileError = null;
      profileSaved = false;
      savingProfile = true;
    });
    try {
      final user = await auth_api.updateProfile(
        name: nameController.text.trim(),
        email: emailController.text.trim().isEmpty ? null : emailController.text.trim(),
      );
      if (mounted) {
        context.read<AuthProvider>().setUser(user);
        setState(() => profileSaved = true);
      }
    } catch (e) {
      setState(() => profileError = extractErrorMessage(e));
    } finally {
      setState(() => savingProfile = false);
    }
  }

  void _handleSaved(Address address) {
    setState(() {
      final list = addresses ?? [];
      final withoutDefaultClash = address.isDefault
          ? list
              .map((a) => Address(
                    id: a.id,
                    label: a.label,
                    addressLine: a.addressLine,
                    latitude: a.latitude,
                    longitude: a.longitude,
                    isDefault: false,
                  ))
              .toList()
          : list;
      final exists = withoutDefaultClash.any((a) => a.id == address.id);
      final next = exists
          ? withoutDefaultClash.map((a) => a.id == address.id ? address : a).toList()
          : [address, ...withoutDefaultClash];
      next.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      addresses = next;
      formOpen = null;
    });
  }

  Future<void> _handleDelete(Address address) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer l\'adresse'),
        content: Text('Supprimer l\'adresse "${address.label}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirmed != true) return;
    await deleteAddress(address.id);
    setState(() => addresses = (addresses ?? []).where((a) => a.id != address.id).toList());
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canSaveProfile = nameController.text.trim().length >= 2;

    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text('INFORMATIONS DU COMPTE',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nom complet'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'E-mail (facultatif)'),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text('Téléphone : ${user?.phone ?? ''} (non modifiable)',
                    style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                if (profileError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Text(profileError!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                  ),
                if (profileSaved)
                  const Padding(
                    padding: EdgeInsets.only(top: AppSpacing.xs),
                    child: Text('Profil mis à jour ✓', style: TextStyle(color: AppColors.success, fontSize: 13)),
                  ),
                const SizedBox(height: AppSpacing.sm),
                ElevatedButton(
                  onPressed: !canSaveProfile || savingProfile ? null : _saveProfile,
                  child: savingProfile
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Enregistrer'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('ADRESSES ENREGISTRÉES',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              if (formOpen == null)
                TextButton(onPressed: () => setState(() => formOpen = 'new'), child: const Text('+ Ajouter')),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (formOpen == 'new') _AddressForm(onCancel: () => setState(() => formOpen = null), onSaved: _handleSaved),
          if (addresses == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            )
          else if (addresses!.isEmpty && formOpen == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(
                child: Text("Aucune adresse enregistrée pour l'instant.", style: TextStyle(color: AppColors.textMuted)),
              ),
            )
          else
            ...addresses!.map((address) {
              if (formOpen == address.id) {
                return _AddressForm(
                  initial: address,
                  onCancel: () => setState(() => formOpen = null),
                  onSaved: _handleSaved,
                );
              }
              return Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(address.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                              if (address.isDefault)
                                Container(
                                  margin: const EdgeInsets.only(left: AppSpacing.sm),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentSoft,
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: const Text('Par défaut',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                                ),
                            ],
                          ),
                          Text(address.addressLine, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit, size: 18),
                      onPressed: () => setState(() => formOpen = address.id),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                      onPressed: () => _handleDelete(address),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
