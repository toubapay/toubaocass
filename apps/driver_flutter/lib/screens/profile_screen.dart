import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/wallet_api.dart';
import '../state/auth_provider.dart';
import '../theme.dart';

const _kycLabel = {
  'pending': 'Non soumis',
  'submitted': "En cours d'examen",
  'approved': 'Vérifié',
  'rejected': 'Refusé',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.onOpenWallet});

  final VoidCallback onOpenWallet;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int? walletBalance;

  @override
  void initState() {
    super.initState();
    fetchWallet().then((w) => setState(() => walletBalance = w.balance)).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final kycStatus = user?.driverProfile?.kycStatus ?? 'pending';
    final rating = user?.driverProfile?.rating ?? 5.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Mon profil', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user?.name ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  const SizedBox(height: AppSpacing.xs),
                  Text(user?.phone ?? '', style: const TextStyle(fontSize: 15, color: AppColors.textMuted)),
                  if (user?.email != null)
                    Text(user!.email!, style: const TextStyle(fontSize: 15, color: AppColors.textMuted)),
                  const SizedBox(height: AppSpacing.sm),
                  Text('Vérification : ${_kycLabel[kycStatus] ?? kycStatus}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('Note : ${rating.toStringAsFixed(1)} ★', style: const TextStyle(fontSize: 15, color: AppColors.textMuted)),
                ],
              ),
            ),
            InkWell(
              onTap: widget.onOpenWallet,
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                margin: const EdgeInsets.only(bottom: AppSpacing.xl),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, color: Colors.white, size: 26),
                        const SizedBox(width: AppSpacing.sm),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Mon portefeuille',
                                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                            Text(walletBalance != null ? '$walletBalance FCFA' : '…',
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ],
                    ),
                    const Icon(Icons.arrow_forward, color: Colors.white),
                  ],
                ),
              ),
            ),
            OutlinedButton(
              onPressed: () => context.read<AuthProvider>().signOut(),
              child: const Text('Déconnexion'),
            ),
          ],
        ),
      ),
    );
  }
}
