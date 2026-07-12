import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import '../theme.dart';

class VoiceSearchButton extends StatefulWidget {
  const VoiceSearchButton({super.key, required this.onResult});

  final void Function(String text) onResult;

  @override
  State<VoiceSearchButton> createState() => _VoiceSearchButtonState();
}

class _VoiceSearchButtonState extends State<VoiceSearchButton> {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _listening = false;

  Future<void> _toggleListening() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }

    final available = await _speech.initialize(
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          if (mounted) setState(() => _listening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => _listening = false);
      },
    );

    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("La recherche vocale n'est pas disponible sur cet appareil.")),
        );
      }
      return;
    }

    setState(() => _listening = true);
    await _speech.listen(
      onResult: (SpeechRecognitionResult result) {
        widget.onResult(result.recognizedWords);
      },
      listenOptions: stt.SpeechListenOptions(localeId: 'fr_FR'),
    );
  }

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: _toggleListening,
      icon: Icon(Icons.mic, color: _listening ? AppColors.danger : AppColors.textMuted),
      tooltip: _listening ? "Arrêter l'écoute" : 'Recherche vocale',
    );
  }
}
