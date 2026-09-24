import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';

const _ranges = ['week', 'month', 'year'];

const _rangeLabels = {'week': 'Semaine', 'month': 'Mois', 'year': 'Année'};

class _Bar extends StatelessWidget {
  const _Bar({required this.label, required this.amount, required this.max});

  final String label;
  final int amount;
  final int max;

  @override
  Widget build(BuildContext context) {
    final widthPct = max > 0 ? (amount / max).clamp(0.04, 1.0) : 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
              Text('${_formatAmount(amount)} F', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.text)),
            ],
          ),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: widthPct,
              minHeight: 6,
              backgroundColor: AppColors.background,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatAmount(int amount) {
  final s = amount.toString();
  final buffer = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(s[i]);
  }
  return buffer.toString();
}

String _formatDate(DateTime at) {
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return '${at.day} ${months[at.month - 1]} ${at.year}';
}

String _formatTime(DateTime at) => '${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}';

/// "Mini" financial report card embedded on a rider's or driver's own
/// profile screen — rider passes [fetchReport] wired to fetchSpendingReport,
/// driver to fetchEarningsReport, both mapped to the same
/// [MiniFinancialReport] shape, mirroring the web/Expo version of this
/// widget: total, by period, by service, by vehicle for drivers, plus a
/// per-trip itemized list with date, time, amount, and who the other party
/// was.
class MiniFinancialReportCard extends StatefulWidget {
  const MiniFinancialReportCard({super.key, required this.title, required this.totalLabel, required this.fetchReport});

  final String title;
  final String totalLabel;
  final Future<MiniFinancialReport> Function(String range) fetchReport;

  @override
  State<MiniFinancialReportCard> createState() => _MiniFinancialReportCardState();
}

class _MiniFinancialReportCardState extends State<MiniFinancialReportCard> {
  String range = 'month';
  MiniFinancialReport? report;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await widget.fetchReport(range);
      if (mounted) setState(() => report = result);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _setRange(String r) {
    setState(() => range = r);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final r = report;

    return Container(
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(widget.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.text)),
              Row(
                children: _ranges
                    .map((rg) => Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: GestureDetector(
                            onTap: () => _setRange(rg),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: range == rg ? AppColors.primary : AppColors.background,
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                _rangeLabels[rg]!,
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: range == rg ? Colors.white : AppColors.textMuted),
                              ),
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (loading || r == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            )
          else ...[
            Text(widget.totalLabel, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
            Text('${_formatAmount(r.total)} FCFA', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.primary)),
            const SizedBox(height: AppSpacing.md),
            if (r.byPeriod.isNotEmpty) ...[
              const Text('PAR PÉRIODE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              ...r.byPeriod.map((row) => _Bar(
                    label: row.label,
                    amount: row.amount,
                    max: r.byPeriod.map((e) => e.amount).fold(1, (a, b) => a > b ? a : b),
                  )),
              const SizedBox(height: AppSpacing.sm),
            ],
            if (r.byService.any((s) => s.count > 0)) ...[
              const Text('PAR SERVICE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              ...r.byService.where((s) => s.count > 0).map((s) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: s.label, style: const TextStyle(fontSize: 13.5, color: AppColors.text)),
                          TextSpan(text: ' (${s.count})', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                        ])),
                        Text('${_formatAmount(s.amount)} F', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.text)),
                      ],
                    ),
                  )),
              const SizedBox(height: AppSpacing.sm),
            ],
            if (r.byVehicle != null && r.byVehicle!.any((v) => v.count > 0)) ...[
              const Text('PAR VÉHICULE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              ...r.byVehicle!.where((v) => v.count > 0).map((v) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: v.label, style: const TextStyle(fontSize: 13.5, color: AppColors.text)),
                          TextSpan(text: ' (${v.count})', style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                        ])),
                        Text('${_formatAmount(v.earnings)} F', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.text)),
                      ],
                    ),
                  )),
              const SizedBox(height: AppSpacing.sm),
            ],
            if (r.items.isNotEmpty) ...[
              const Text('DÉTAIL DES TRAJETS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.sm),
              ...r.items.map((item) {
                final at = DateTime.parse(item.completedAt).toLocal();
                final title = item.destination != null ? '${item.typeLabel} · ${item.destination}' : item.typeLabel;
                final meta = item.counterpartyName != null
                    ? '${item.counterpartyName} · ${_formatDate(at)} à ${_formatTime(at)}'
                    : '${_formatDate(at)} à ${_formatTime(at)}';

                return Container(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.background))),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.text)),
                            const SizedBox(height: 2),
                            Text(meta, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text('${_formatAmount(item.amount)} F', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.text)),
                    ],
                  ),
                );
              }),
            ],
            if (r.itemsCount == 0)
              const Text('Rien à afficher pour cette période.', style: TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }
}
