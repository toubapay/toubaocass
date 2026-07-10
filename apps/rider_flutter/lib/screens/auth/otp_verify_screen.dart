import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/client.dart';
import '../../state/auth_provider.dart';
import '../../theme.dart';

class OtpVerifyScreen extends StatefulWidget {
  const OtpVerifyScreen({super.key, required this.phone});

  final String phone;

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  final codeController = TextEditingController();
  bool loading = false;
  bool resending = false;
  String? error;

  Future<void> _verify() async {
    setState(() {
      error = null;
      loading = true;
    });
    try {
      await context.read<AuthProvider>().confirmOtp(widget.phone, codeController.text.trim());
      // RootRouter swaps to profile-setup or the main app automatically.
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _resend() async {
    setState(() => resending = true);
    try {
      await context.read<AuthProvider>().sendOtp(widget.phone);
    } catch (e) {
      setState(() => error = extractErrorMessage(e));
    } finally {
      setState(() => resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => Navigator.of(context).maybePop())),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Saisissez le code', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.sm),
            Text('Nous avons envoyé un code de vérification par SMS au ${widget.phone}.',
                style: const TextStyle(fontSize: 15, color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: InputDecoration(labelText: 'Code de vérification', hintText: '123456', errorText: error),
              onChanged: (_) => setState(() {}),
            ),
            ElevatedButton(
              onPressed: loading || codeController.text.trim().length < 4 ? null : _verify,
              child: loading
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Vérifier'),
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: resending ? null : _resend,
              child: Text(resending ? 'Envoi en cours...' : 'Renvoyer le code'),
            ),
          ],
        ),
      ),
    );
  }
}
