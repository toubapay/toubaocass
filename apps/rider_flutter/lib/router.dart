import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/auth/otp_verify_screen.dart';
import 'screens/auth/phone_entry_screen.dart';
import 'screens/auth/profile_setup_screen.dart';
import 'screens/home_screen.dart';
import 'screens/my_bookings_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trip_detail_screen.dart';
import 'state/auth_provider.dart';

class _MainShell extends StatelessWidget {
  const _MainShell({required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
          NavigationDestination(
              icon: Icon(Icons.confirmation_number_outlined),
              selectedIcon: Icon(Icons.confirmation_number),
              label: 'Réservations'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}

GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    refreshListenable: auth,
    initialLocation: '/',
    redirect: (context, state) {
      if (auth.isLoading) return null;
      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/verify';

      if (!auth.isAuthenticated) {
        return loggingIn ? null : '/login';
      }
      if (auth.user?.profileComplete != true) {
        return state.matchedLocation == '/profile-setup' ? null : '/profile-setup';
      }
      if (loggingIn || state.matchedLocation == '/profile-setup') {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => PhoneEntryScreen(onSent: (phone) => context.push('/verify', extra: phone))),
      GoRoute(
        path: '/verify',
        builder: (context, state) => OtpVerifyScreen(phone: state.extra as String? ?? ''),
      ),
      GoRoute(path: '/profile-setup', builder: (context, state) => const ProfileSetupScreen()),
      GoRoute(
        path: '/trips/:id',
        builder: (context, state) => TripDetailScreen(tripId: int.parse(state.pathParameters['id']!)),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => _MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (context, state) => HomeScreen(onOpenTrip: (id) => context.push('/trips/$id'))),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/bookings',
                builder: (context, state) => MyBookingsScreen(onOpenTrip: (id) => context.push('/trips/$id'))),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
}
