import 'package:flutter/material.dart';

import '../api/ratings_api.dart';
import '../theme.dart';

const _months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/// Manual "d MMM y" formatting in French, avoiding a dependency on intl's
/// locale data tables (which would need explicit initialization elsewhere
/// in the app first).
String _formatDate(DateTime date) => '${date.day} ${_months[date.month - 1]} ${date.year}';

const _rateableTypeLabel = {
  'trip': 'Trajet',
  'dem_legui_trip': 'Dem Légui',
  'delivery': 'Livraison',
};

Widget _stars(int score) {
  return RichText(
    text: TextSpan(
      children: [
        TextSpan(text: '★' * score, style: const TextStyle(color: AppColors.primary, fontSize: 15)),
        TextSpan(text: '★' * (5 - score), style: const TextStyle(color: AppColors.border, fontSize: 15)),
      ],
    ),
  );
}

/// Reviews riders/senders have left this driver, across Trip/Dem
/// Légui/Delivery — mirrors driver-web's MyRatingsPage.
class MyRatingsScreen extends StatefulWidget {
  const MyRatingsScreen({super.key});

  @override
  State<MyRatingsScreen> createState() => _MyRatingsScreenState();
}

class _MyRatingsScreenState extends State<MyRatingsScreen> {
  List<DriverRating> _ratings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    fetchMyRatings().then((res) {
      if (mounted) setState(() => _ratings = res.data);
    }).whenComplete(() {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes avis')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _ratings.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.lg),
                    child: Text('Aucun avis pour le moment.', style: TextStyle(color: AppColors.textMuted, fontSize: 16), textAlign: TextAlign.center),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: _ratings.length,
                  itemBuilder: (context, index) {
                    final rating = _ratings[index];
                    String dateLabel;
                    try {
                      dateLabel = _formatDate(DateTime.parse(rating.createdAt).toLocal());
                    } catch (_) {
                      dateLabel = '';
                    }
                    return Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
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
                              _stars(rating.score),
                              Text(dateLabel, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '${rating.raterName ?? 'Passager anonyme'} · ${_rateableTypeLabel[rating.rateableType] ?? rating.rateableType}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                            ),
                          ),
                          if (rating.comment != null && rating.comment!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(rating.comment!, style: const TextStyle(fontSize: 14.5)),
                            ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
