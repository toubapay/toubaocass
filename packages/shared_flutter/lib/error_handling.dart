import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'theme.dart';

/// Wires up app-wide error handling, mirroring the web apps' ErrorBoundary:
/// a plain, friendly fallback instead of raw stack traces or a silently
/// crashed session. Call once from main(), before runApp().
///
/// Two separate hooks are needed because they cover different failure
/// classes: ErrorWidget.builder only replaces a widget subtree that threw
/// while building; FlutterError.onError/PlatformDispatcher.onError also
/// catch errors outside the widget tree (async callbacks, framework
/// bindings) that would otherwise just print to the console uncaught.
void installGlobalErrorHandling() {
  ErrorWidget.builder = (details) {
    FlutterError.presentError(details);
    return _ErrorFallback(details: details);
  };

  final previousOnError = FlutterError.onError;
  FlutterError.onError = (details) {
    previousOnError?.call(details);
    debugPrint('Uncaught Flutter error: ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Uncaught platform error: $error\n$stack');
    return true;
  };
}

class _ErrorFallback extends StatelessWidget {
  const _ErrorFallback({required this.details});

  final FlutterErrorDetails details;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Une erreur est survenue.',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.text),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: AppSpacing.xs),
          Text(
            "Veuillez redémarrer l'application.",
            style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
