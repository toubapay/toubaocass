import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router.dart';
import 'state/auth_provider.dart';
import 'state/module_status_provider.dart';
import 'theme.dart';

void main() {
  runApp(const IntercityDriverApp());
}

class IntercityDriverApp extends StatefulWidget {
  const IntercityDriverApp({super.key});

  @override
  State<IntercityDriverApp> createState() => _IntercityDriverAppState();
}

class _IntercityDriverAppState extends State<IntercityDriverApp> {
  final auth = AuthProvider();
  final moduleStatus = ModuleStatusProvider();
  late final router = buildRouter(auth);

  @override
  void initState() {
    super.initState();
    auth.bootstrap();
    moduleStatus.load();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: moduleStatus),
      ],
      child: MaterialApp.router(
        title: 'Intercity Driver',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        routerConfig: router,
        builder: (context, child) {
          if (auth.isLoading) {
            return const Scaffold(
              backgroundColor: AppColors.background,
              body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            );
          }
          return child ?? const SizedBox.shrink();
        },
      ),
    );
  }
}
