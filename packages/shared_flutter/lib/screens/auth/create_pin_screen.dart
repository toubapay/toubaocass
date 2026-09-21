import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

/// Shown once, right after OTP verification, to anyone who doesn't have a
/// PIN yet (new sign-ups, or existing accounts predating this feature) —
/// from then on they can skip the SMS round-trip and log in with phone +
/// PIN (see PhoneEntryScreen's "login" tab). Mirrors the web apps'
/// CreatePinPage — no navigation call needed here: once setPin() flips
/// AuthProvider.user.hasPin, the router's redirect re-evaluates and moves
/// on (profile setup, or straight in) on its own.
class CreatePinScreen extends StatefulWidget {
  const CreatePinScreen({super.key});

  @override
  State<CreatePinScreen> createState() => _CreatePinScreenState();
}

class _CreatePinScreenState extends State<CreatePinScreen> {
  final pinController = TextEditingController();
  final confirmController = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> _submit() async {
    if (pinController.text != confirmController.text) {
      setState(() => error = 'Les codes ne correspondent pas.');
      return;
    }
    setState(() {
      error = null;
      loading = true;
    });
    try {
      await context.read<AuthProvider>().setPin(pinController.text);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit = pinController.text.length == 4 && confirmController.text.length == 4;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.xl),
              const Text('Créez votre code PIN', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppSpacing.sm),
              const Text(
                'Ce code à 4 chiffres vous permettra de vous reconnecter rapidement, sans code SMS.',
                style: TextStyle(fontSize: 16, color: AppColors.textMuted),
              ),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                controller: pinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                maxLength: 4,
                decoration: const InputDecoration(labelText: 'Code PIN', counterText: ''),
                onChanged: (v) => setState(() {}),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: confirmController,
                keyboardType: TextInputType.number,
                obscureText: true,
                maxLength: 4,
                decoration: InputDecoration(labelText: 'Confirmez le code PIN', counterText: '', errorText: error),
                onChanged: (v) => setState(() {}),
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: loading || !canSubmit ? null : _submit,
                child: loading
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Terminer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
