import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/auth_api.dart' as auth_api;
import '../../api/client.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> _submit() async {
    setState(() {
      error = null;
      loading = true;
    });
    try {
      final user = await auth_api.updateProfile(
        name: nameController.text.trim(),
        email: emailController.text.trim().isEmpty ? null : emailController.text.trim(),
      );
      if (mounted) context.read<AuthProvider>().setUser(user);
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
              const Text('Parlez-nous de vous', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppSpacing.sm),
              const Text('Votre nom suffit pour commencer.', style: TextStyle(fontSize: 16, color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: 'Nom complet', hintText: 'Awa Ndiaye', errorText: error),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'E-mail (facultatif)', hintText: 'awa@example.com'),
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: loading || nameController.text.trim().length < 2 ? null : _submit,
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
