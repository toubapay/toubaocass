import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/wallet_api.dart';
import '../models.dart';
import '../theme.dart';

const _typeLabel = {
  'top_up': 'Rechargement',
  'payment': 'Paiement de trajet',
  'earning': 'Revenu de trajet',
  'refund': 'Remboursement',
  'refund_reversal': 'Reprise de revenu',
};

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Wallet? wallet;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchWallet().then((w) => setState(() => wallet = w)).whenComplete(() => setState(() => loading = false));
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.decimalPattern('fr');

    if (loading || wallet == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mon portefeuille')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final w = wallet!;

    return Scaffold(
      appBar: AppBar(title: const Text('Mon portefeuille')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Solde disponible', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.xs),
                Text('${currency.format(w.balance)} FCFA',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          const Text(
            'Pour recharger votre portefeuille, contactez notre équipe — le rechargement est ajouté par un administrateur.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: AppSpacing.lg),
          const Text('HISTORIQUE', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.sm),
          if (w.transactions.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
              child: Center(
                child: Text("Aucune transaction pour l'instant.", style: TextStyle(color: AppColors.textMuted)),
              ),
            )
          else
            ...w.transactions.map((tx) => Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(tx.description ?? _typeLabel[tx.type] ?? tx.type,
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text(tx.createdAt, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      Text(
                        '${tx.amount >= 0 ? '+' : ''}${currency.format(tx.amount)} FCFA',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: tx.amount >= 0 ? AppColors.success : AppColors.danger,
                        ),
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }
}
