import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/dem_legui_api.dart';
import '../state/auth_provider.dart';
import '../theme.dart';
import '../utils/my_location.dart';

const _locationPingInterval = Duration(seconds: 15);

/// Manual online/offline switch — going online marks the driver dispatchable
/// for Dem Légui requests and starts a foreground-only position ping; going
/// offline stops it. Mirrors the RN apps' DriverAvailabilityToggle.
class DriverAvailabilityToggle extends StatefulWidget {
  const DriverAvailabilityToggle({super.key});

  @override
  State<DriverAvailabilityToggle> createState() => _DriverAvailabilityToggleState();
}

class _DriverAvailabilityToggleState extends State<DriverAvailabilityToggle> {
  bool toggling = false;
  String? error;
  Timer? _pingTimer;

  @override
  void dispose() {
    _pingTimer?.cancel();
    super.dispose();
  }

  Future<void> _report() async {
    try {
      final coords = await requestMyLocation();
      await updateDriverLocation(coords.latitude, coords.longitude);
    } catch (_) {
      // best-effort; skip this tick on failure
    }
  }

  void _startPinging() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(_locationPingInterval, (_) => _report());
  }

  Future<void> _handleToggle(bool next) async {
    setState(() {
      toggling = true;
      error = null;
    });
    final auth = context.read<AuthProvider>();
    try {
      if (next) {
        final coords = await requestMyLocation();
        final profile = await updateDriverAvailability(isOnline: true, latitude: coords.latitude, longitude: coords.longitude);
        final user = auth.user;
        if (user != null) auth.setUser(user.copyWith(driverProfile: profile));
        _startPinging();
      } else {
        final profile = await updateDriverAvailability(isOnline: false);
        final user = auth.user;
        if (user != null) auth.setUser(user.copyWith(driverProfile: profile));
        _pingTimer?.cancel();
      }
    } on LocationRequestException catch (e) {
      setState(() => error = e.message);
    } catch (_) {
      setState(() => error = 'Impossible de mettre à jour votre statut. Réessayez.');
    } finally {
      if (mounted) setState(() => toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = context.watch<AuthProvider>().user?.driverProfile?.isOnline ?? false;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: isOnline ? AppColors.primary : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isOnline ? AppColors.primary : AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOnline ? 'Vous êtes en ligne' : 'Vous êtes hors ligne',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: isOnline ? Colors.white : AppColors.text),
                    ),
                    Text(
                      isOnline
                          ? 'Vous recevez les demandes de course à proximité.'
                          : 'Passez en ligne pour recevoir des demandes de course.',
                      style: TextStyle(fontSize: 13, color: isOnline ? Colors.white70 : AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              if (toggling)
                SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: isOnline ? Colors.white : AppColors.primary),
                )
              else
                Switch(value: isOnline, onChanged: _handleToggle),
            ],
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xs),
              child: Text(error!, style: const TextStyle(fontSize: 12.5, color: AppColors.danger)),
            ),
        ],
      ),
    );
  }
}
