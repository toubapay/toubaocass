import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/auth/otp_verify_screen.dart';
import 'screens/auth/phone_entry_screen.dart';
import 'screens/auth/profile_setup_screen.dart';
import 'screens/fleet/add_car_screen.dart';
import 'screens/fleet/cars_list_screen.dart';
import 'screens/kyc/kyc_form_screen.dart';
import 'screens/kyc/kyc_status_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trips/post_trip_screen.dart';
import 'screens/trips/trip_detail_screen.dart';
import 'screens/trips/trips_list_screen.dart';
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
          NavigationDestination(icon: Icon(Icons.directions_car_outlined), selectedIcon: Icon(Icons.directions_car), label: 'Trajets'),
          NavigationDestination(icon: Icon(Icons.garage_outlined), selectedIcon: Icon(Icons.garage), label: 'Flotte'),
          NavigationDestination(icon: Icon(Icons.verified_user_outlined), selectedIcon: Icon(Icons.verified_user), label: 'Vérification'),
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
      GoRoute(path: '/verify', builder: (context, state) => OtpVerifyScreen(phone: state.extra as String? ?? '')),
      GoRoute(path: '/profile-setup', builder: (context, state) => const ProfileSetupScreen()),
      GoRoute(
        path: '/trips/:id',
        builder: (context, state) => TripDetailScreen(
          tripId: int.parse(state.pathParameters['id']!),
          onCancelled: () => context.pop(),
        ),
      ),
      GoRoute(path: '/post-trip', builder: (context, state) => PostTripScreen(onCreated: () => context.pop())),
      GoRoute(path: '/add-car', builder: (context, state) => AddCarScreen(onSaved: () => context.pop())),
      GoRoute(path: '/kyc-form', builder: (context, state) => KycFormScreen(onSubmitted: () => context.pop())),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => _MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => TripsListScreen(
                onOpenTrip: (id) => context.push('/trips/$id'),
                onPostTrip: () => context.push('/post-trip'),
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/cars', builder: (context, state) => CarsListScreen(onAddCar: () => context.push('/add-car'))),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/kyc',
              builder: (context, state) => KycStatusScreen(onSubmitDocuments: () => context.push('/kyc-form')),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
}
