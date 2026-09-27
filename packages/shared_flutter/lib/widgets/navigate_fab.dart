import 'package:flutter/material.dart';

import '../theme.dart';
import '../utils/navigation.dart';

class NavigateFab extends StatelessWidget {
  final double latitude;
  final double longitude;
  final String label;

  const NavigateFab({super.key, required this.latitude, required this.longitude, required this.label});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).size.height / 2 - 22,
      right: 0,
      child: Semantics(
        label: label,
        button: true,
        child: Material(
          color: AppColors.primary,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(22), bottomLeft: Radius.circular(22)),
          elevation: 6,
          child: InkWell(
            onTap: () => openNavigation(latitude, longitude),
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(22), bottomLeft: Radius.circular(22)),
            child: const SizedBox(
              width: 44,
              height: 44,
              child: Center(child: Text('🧭', style: TextStyle(fontSize: 20))),
            ),
          ),
        ),
      ),
    );
  }
}
