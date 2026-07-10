import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../api/kyc_api.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

class KycFormScreen extends StatefulWidget {
  const KycFormScreen({super.key, required this.onSubmitted});

  final VoidCallback onSubmitted;

  @override
  State<KycFormScreen> createState() => _KycFormScreenState();
}

class _KycFormScreenState extends State<KycFormScreen> {
  final licenseNumberController = TextEditingController();
  final nationalIdController = TextEditingController();
  DateTime? licenseExpiry;
  XFile? idDocument;
  XFile? licenseDocument;
  XFile? selfie;
  bool loading = false;

  bool get canSubmit =>
      licenseNumberController.text.trim().isNotEmpty &&
      licenseExpiry != null &&
      nationalIdController.text.trim().isNotEmpty &&
      idDocument != null &&
      licenseDocument != null &&
      selfie != null;

  Future<void> _pick(void Function(XFile) onPicked) async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (file != null) setState(() => onPicked(file));
  }

  Future<void> _submit() async {
    if (!canSubmit) return;
    setState(() => loading = true);
    try {
      await submitKyc(
        licenseNumber: licenseNumberController.text.trim(),
        licenseExpiry: licenseExpiry!.toIso8601String().substring(0, 10),
        nationalIdNumber: nationalIdController.text.trim(),
        idDocumentPath: idDocument!.path,
        licenseDocumentPath: licenseDocument!.path,
        selfiePath: selfie!.path,
      );
      if (mounted) await context.read<AuthProvider>().refreshUser();
      if (mounted) {
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Documents soumis'),
            content: const Text('Nous examinerons vos documents sous peu.'),
            actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK'))],
          ),
        );
        widget.onSubmitted();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget _documentPicker(String label, XFile? file, void Function(XFile) onPicked) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          InkWell(
            onTap: () => _pick(onPicked),
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.border),
              ),
              child: file != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Image.file(File(file.path), fit: BoxFit.cover, width: double.infinity),
                    )
                  : const Center(
                      child: Text('Appuyez pour envoyer une photo', style: TextStyle(color: AppColors.textMuted))),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Soumettre les documents')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          TextField(
            controller: licenseNumberController,
            decoration: const InputDecoration(labelText: 'Numéro de permis de conduire'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now().add(const Duration(days: 365)),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
              );
              if (picked != null) setState(() => licenseExpiry = picked);
            },
            child: Text(licenseExpiry != null
                ? "Expiration : ${licenseExpiry!.toIso8601String().substring(0, 10)}"
                : "Date d'expiration du permis"),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: nationalIdController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: "Numéro de carte d'identité nationale"),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpacing.md),
          _documentPicker("Photo de la carte d'identité", idDocument, (f) => idDocument = f),
          _documentPicker('Photo du permis de conduire', licenseDocument, (f) => licenseDocument = f),
          _documentPicker('Selfie', selfie, (f) => selfie = f),
          ElevatedButton(
            onPressed: canSubmit && !loading ? _submit : null,
            child: loading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Soumettre pour examen'),
          ),
        ],
      ),
    );
  }
}
