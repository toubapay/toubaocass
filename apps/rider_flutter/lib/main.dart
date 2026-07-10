import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router.dart';
import 'state/auth_provider.dart';
import 'theme.dart';

void main() {
  runApp(const IntercityRiderApp());
}

class IntercityRiderApp extends StatefulWidget {
  const IntercityRiderApp({super.key});

  @override
  State<IntercityRiderApp> createState() => _IntercityRiderAppState();
}

class _IntercityRiderAppState extends State<IntercityRiderApp> {
  final auth = AuthProvider();
  late final router = buildRouter(auth);

  @override
  void initState() {
    super.initState();
    auth.bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: auth,
      child: MaterialApp.router(
        title: 'Intercity Rider',
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
