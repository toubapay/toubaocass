import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

class PhoneEntryScreen extends StatefulWidget {
  const PhoneEntryScreen({super.key, required this.onSent});

  final void Function(String phone) onSent;

  @override
  State<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends State<PhoneEntryScreen> {
  final phoneController = TextEditingController(text: '+221');
  bool loading = false;
  String? error;

  Future<void> _submit() async {
    setState(() {
      error = null;
      loading = true;
    });
    try {
      final phone = phoneController.text.trim();
      await context.read<AuthProvider>().sendOtp(phone);
      widget.onSent(phone);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => loading = false);
    }
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
              const SizedBox(height: AppSpacing.xl),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Numéro de téléphone',
                  hintText: '+221 77 000 00 00',
                  errorText: error,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: loading ? null : _submit,
                child: loading
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Continuer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
