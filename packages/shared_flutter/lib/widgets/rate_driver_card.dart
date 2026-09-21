import 'package:flutter/material.dart';

import '../theme.dart';

/// Shown once a trip/delivery reaches its terminal success status
/// (completed/delivered) so the rider can leave a 1-5 star review of the
/// driver. Submitting is an upsert on the backend, so re-opening this after
/// already rating just edits the existing review — no "already rated" state
/// to track here.
class RateDriverCard extends StatefulWidget {
  const RateDriverCard({super.key, required this.onSubmit});

  final Future<void> Function(int score, String? comment) onSubmit;

  @override
  State<RateDriverCard> createState() => _RateDriverCardState();
}

class _RateDriverCardState extends State<RateDriverCard> {
  int _score = 0;
  final _commentController = TextEditingController();
  bool _submitting = false;
  bool _submitted = false;
  String? _error;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_score == 0) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final comment = _commentController.text.trim();
      await widget.onSubmit(_score, comment.isEmpty ? null : comment);
      if (mounted) setState(() => _submitted = true);
    } catch (e) {
      if (mounted) setState(() => _error = 'Une erreur est survenue. Réessayez.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
        child: const Text('Merci pour votre avis !', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.success)),
      );
    }

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
          const Text('Notez votre chauffeur', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: List.generate(
              5,
              (i) => IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: Icon(i < _score ? Icons.star : Icons.star_border, color: AppColors.primary, size: 30),
                onPressed: () => setState(() => _score = i + 1),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _commentController,
            minLines: 2,
            maxLines: 3,
            maxLength: 500,
            decoration: const InputDecoration(hintText: 'Un commentaire ? (facultatif)'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _score == 0 || _submitting ? null : _handleSubmit,
              child: _submitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Envoyer mon avis'),
            ),
          ),
        ],
      ),
    );
  }
}
