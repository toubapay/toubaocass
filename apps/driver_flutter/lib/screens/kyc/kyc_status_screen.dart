import 'package:flutter/material.dart';

import '../../api/kyc_api.dart';
import '../../models.dart';
import '../../theme.dart';

class _StatusCopy {
  final String title;
  final String body;
  final Color color;
  const _StatusCopy(this.title, this.body, this.color);
}

const _statusCopy = {
  'pending': _StatusCopy(
    'Vérification requise',
    "Soumettez votre pièce d'identité, votre permis de conduire et un selfie pour commencer à publier des trajets.",
    AppColors.textMuted,
  ),
  'submitted': _StatusCopy(
    "En cours d'examen",
    'Nous examinons vos documents. Cela prend généralement moins de 24 heures.',
    AppColors.accent,
  ),
  'approved': _StatusCopy(
    'Vérifié',
    'Votre compte est vérifié. Vous pouvez publier des trajets à tout moment.',
    AppColors.success,
  ),
  'rejected': _StatusCopy(
    'Vérification refusée',
    'Veuillez consulter la raison ci-dessous et soumettre à nouveau vos documents.',
    AppColors.danger,
  ),
};

class KycStatusScreen extends StatefulWidget {
  const KycStatusScreen({super.key, required this.onSubmitDocuments});

  final VoidCallback onSubmitDocuments;

  @override
  State<KycStatusScreen> createState() => _KycStatusScreenState();
}

class _KycStatusScreenState extends State<KycStatusScreen> {
  DriverProfile? profile;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await fetchKycStatus();
      setState(() => profile = result);
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Vérification')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final status = profile?.kycStatus ?? 'pending';
    final copy = _statusCopy[status]!;

    return Scaffold(
      appBar: AppBar(title: const Text('Vérification')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            const Text('Vérification conducteur', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(copy.title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: copy.color)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(copy.body, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                  if (status == 'rejected' && profile?.kycRejectionReason != null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.sm),
                      child: Text(profile!.kycRejectionReason!, style: const TextStyle(fontSize: 13, color: AppColors.danger)),
                    ),
                ],
              ),
            ),
            if (status != 'submitted' && status != 'approved')
              ElevatedButton(
                onPressed: widget.onSubmitDocuments,
                child: const Text('Soumettre les documents'),
              ),
          ],
        ),
      ),
    );
  }
}
