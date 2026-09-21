import 'package:flutter/material.dart';

import '../theme.dart';

const _tierLabels = {
  'debutant': 'Débutant',
  'silver': 'Argent',
  'gold': 'Or',
};

const _tierIcons = {
  'debutant': '🌱',
  'silver': '🥈',
  'gold': '🥇',
};

class DriverTierBadge extends StatelessWidget {
  const DriverTierBadge({super.key, required this.tier});

  final String? tier;

  @override
  Widget build(BuildContext context) {
    final t = tier;
    if (t == null) return const SizedBox.shrink();

    final Color bg;
    final Color fg;
    switch (t) {
      case 'gold':
        bg = const Color(0xFFFCEFC7);
        fg = AppColors.primary;
        break;
      case 'silver':
        bg = const Color(0xFFE5E9EC);
        fg = const Color(0xFF5B6770);
        break;
      default:
        bg = AppColors.border;
        fg = AppColors.textMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Text(
        '${_tierIcons[t] ?? '🌱'} ${_tierLabels[t] ?? t}',
        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
