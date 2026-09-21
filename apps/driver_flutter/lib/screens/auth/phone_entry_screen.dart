import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

enum _Mode { login, register }

class PhoneEntryScreen extends StatefulWidget {
  const PhoneEntryScreen({super.key, required this.onSent});

  final void Function(String phone) onSent;

  @override
  State<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends State<PhoneEntryScreen> {
  final phoneController = TextEditingController(text: '+221');
  final pinController = TextEditingController();
  _Mode mode = _Mode.login;
  bool loading = false;
  String? error;

  void _switchMode(_Mode next) {
    setState(() {
      mode = next;
      pinController.clear();
      error = null;
    });
  }

  Future<void> _submit() async {
    setState(() {
      error = null;
      loading = true;
    });
    try {
      final phone = phoneController.text.trim();
      if (mode == _Mode.login) {
        await context.read<AuthProvider>().confirmPin(phone, pinController.text.trim(), role: 'driver');
        // No navigation needed — the router's redirect re-evaluates once
        // AuthProvider.user flips to authenticated.
      } else {
        await context.read<AuthProvider>().sendOtp(phone);
        widget.onSent(phone);
      }
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  bool get _isSubmitDisabled {
    final phoneOk = phoneController.text.trim().length >= 8;
    return mode == _Mode.login ? !phoneOk || pinController.text.length < 4 : !phoneOk;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.xl),
              const Text('Intercity Driver', style: TextStyle(fontSize: 31, fontWeight: FontWeight.w800, color: AppColors.primary)),
              const SizedBox(height: AppSpacing.sm),
              const Text('Publiez vos trajets et prenez des passagers partout au Sénégal.',
                  style: TextStyle(fontSize: 18, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _switchMode(_Mode.login),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: mode == _Mode.login ? AppColors.primary : null,
                        foregroundColor: mode == _Mode.login ? Colors.white : AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                      ),
                      child: const Text('Se connecter'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _switchMode(_Mode.register),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: mode == _Mode.register ? AppColors.primary : null,
                        foregroundColor: mode == _Mode.register ? Colors.white : AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                      ),
                      child: const Text('Créer un compte'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Numéro de téléphone',
                  hintText: '+221 77 000 00 00',
                ),
                onChanged: (_) => setState(() {}),
              ),
              if (mode == _Mode.login) ...[
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: pinController,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 4,
                  decoration: InputDecoration(labelText: 'Code PIN', counterText: '', errorText: error),
                  onChanged: (_) => setState(() {}),
                ),
              ] else if (error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
              ],
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: loading || _isSubmitDisabled ? null : _submit,
                child: loading
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(mode == _Mode.login ? 'Se connecter' : 'Continuer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
