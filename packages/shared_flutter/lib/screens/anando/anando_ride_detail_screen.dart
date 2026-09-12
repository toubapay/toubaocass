import 'package:flutter/material.dart';

import '../../api/anando_api.dart';
import '../../api/client.dart';
import '../../api/tracking_api.dart';
import '../../api/wallet_api.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../widgets/sos_share_sheet.dart';

const _statusLabel = {
  'open': 'Disponible',
  'full': 'Complet',
  'in_progress': 'En cours',
  'cancelled': 'Annulé',
  'completed': 'Terminé',
};

Future<void> _showRateDialog(BuildContext context, {required int rideId, required int rateeId, required String rateeName}) async {
  int score = 5;
  final commentController = TextEditingController();
  await showDialog(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text('Noter $rateeName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                5,
                (i) => IconButton(
                  icon: Icon(i < score ? Icons.star : Icons.star_border, color: AppColors.primary),
                  onPressed: () => setState(() => score = i + 1),
                ),
              ),
            ),
            TextField(controller: commentController, decoration: const InputDecoration(hintText: 'Commentaire (facultatif)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              try {
                await rateAnandoRide(rideId, rateeId: rateeId, score: score, comment: commentController.text.trim());
              } catch (_) {
                // best-effort
              }
              if (context.mounted) Navigator.of(context).pop();
            },
            child: const Text('Envoyer'),
          ),
        ],
      ),
    ),
  );
}

class AnandoRideDetailScreen extends StatefulWidget {
  const AnandoRideDetailScreen({super.key, required this.rideId});

  final int rideId;

  @override
  State<AnandoRideDetailScreen> createState() => _AnandoRideDetailScreenState();
}

class _AnandoRideDetailScreenState extends State<AnandoRideDetailScreen> {
  AnandoRide? ride;
  bool loading = true;
  String? error;
  final seatsController = TextEditingController(text: '1');
  String paymentMethod = 'cash';
  int? walletBalance;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    _load();
    fetchWallet().then((w) => setState(() => walletBalance = w.balance)).catchError((_) {});
  }

  @override
  void dispose() {
    seatsController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await fetchAnandoRide(widget.rideId);
      if (mounted) setState(() => ride = result);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await action();
      await _load();
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading || ride == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    final r = ride!;
    final insufficientFunds = paymentMethod == 'wallet' &&
        walletBalance != null &&
        walletBalance! < r.pricePerSeat * (int.tryParse(seatsController.text) ?? 1);

    return Scaffold(
      appBar: AppBar(title: Text('${r.originCity?.name ?? '?'} → ${r.destinationCity?.name ?? '?'}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Text(_statusLabel[r.status] ?? r.status, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.accent)),
              const SizedBox(width: AppSpacing.sm),
              Text('${r.availableSeats}/${r.totalSeats} places disponibles', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (r.status == 'in_progress')
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: OutlinedButton(
                onPressed: () => showSosShareSheet(context, kind: ShareableRideKind.anandoRides, rideId: r.id),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                child: const Text('🆘 Partager ma position'),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PUBLIÉ PAR', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Text(r.poster.name ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                Text(r.poster.phone, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                if (r.poster.anandoRating != null)
                  Text('★ ${r.poster.anandoRating!.toStringAsFixed(1)} (${r.poster.anandoRatingsCount})', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                if (r.departurePoint != null) Text('📍 ${r.departurePoint}', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
                Text('${r.pricePerSeat} FCFA / place', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
              ],
            ),
          ),
          if (error != null) Padding(padding: const EdgeInsets.only(bottom: AppSpacing.sm), child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13.5))),

          if (r.isMine) ...[
            if (r.status == 'open' || r.status == 'full')
              ElevatedButton(onPressed: busy ? null : () => _run(() => startAnandoRide(r.id)), child: const Text('Démarrer le trajet')),
            if (r.status == 'in_progress')
              ElevatedButton(onPressed: busy ? null : () => _run(() => completeAnandoRide(r.id)), child: const Text('Terminer le trajet')),
            if (r.status == 'open' || r.status == 'full')
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm),
                child: OutlinedButton(
                  onPressed: busy
                      ? null
                      : () => _run(() => cancelAnandoRide(r.id)),
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                  child: const Text('Annuler ce trajet'),
                ),
              ),
          ] else if (r.myBooking != null) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.border)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('MA RÉSERVATION', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  Text('${r.myBooking!.seatsBooked} place(s) · ${r.myBooking!.priceTotal} FCFA', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            if (r.myBooking!.status == 'confirmed' && (r.status == 'open' || r.status == 'full'))
              OutlinedButton(
                onPressed: busy
                    ? null
                    : () => _run(() => cancelAnandoRideBooking(r.myBooking!.id)),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                child: const Text('Annuler ma réservation'),
              ),
          ] else if (r.isJoinable) ...[
            const Text('REJOINDRE CE TRAJET', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: seatsController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Nombre de places'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: AppSpacing.sm),
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
            const SizedBox(height: AppSpacing.sm),
            ElevatedButton(
              onPressed: busy || insufficientFunds
                  ? null
                  : () => _run(() => joinAnandoRide(r.id, seats: int.tryParse(seatsController.text) ?? 1, paymentMethod: paymentMethod)),
              child: Text('Rejoindre — ${r.pricePerSeat * (int.tryParse(seatsController.text) ?? 1)} FCFA'),
            ),
          ],

          if (r.status == 'completed') ...[
            const SizedBox(height: AppSpacing.md),
            OutlinedButton(
              onPressed: () => _showRateDialog(
                context,
                rideId: r.id,
                rateeId: r.isMine ? ((r.bookings != null && r.bookings!.isNotEmpty) ? r.bookings!.first.user.id : 0) : r.poster.id,
                rateeName: r.isMine ? 'le passager' : (r.poster.name ?? ''),
              ),
              child: const Text('Laisser un avis'),
            ),
          ],
        ],
      ),
    );
  }
}
