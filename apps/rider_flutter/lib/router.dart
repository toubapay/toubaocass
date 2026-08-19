import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/anando/anando_ride_detail_screen.dart';
import 'screens/anando/anando_screen.dart';
import 'screens/auth/otp_verify_screen.dart';
import 'screens/auth/phone_entry_screen.dart';
import 'screens/auth/profile_setup_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/dem_legui/dem_legui_request_detail_screen.dart';
import 'screens/dem_legui/new_dem_legui_request_screen.dart';
import 'screens/deliveries/delivery_detail_screen.dart';
import 'screens/deliveries/my_deliveries_screen.dart';
import 'screens/deliveries/new_delivery_screen.dart';
import 'screens/home_screen.dart';
import 'screens/insurance/insurance_screen.dart';
import 'screens/insurance/my_policies_screen.dart';
import 'screens/my_bookings_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/services_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/trip_detail_screen.dart';
import 'screens/wallet_screen.dart';
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
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps), label: 'Services'),
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
      GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(
        path: '/trips/:id',
        builder: (context, state) => TripDetailScreen(
          tripId: int.parse(state.pathParameters['id']!),
          onOpenChat: (bookingId, title, subtitle) =>
              context.push('/chat/$bookingId', extra: {'title': title, 'subtitle': subtitle}),
        ),
      ),
      GoRoute(
        path: '/chat/:bookingId',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ChatScreen(
            bookingId: int.parse(state.pathParameters['bookingId']!),
            title: extra?['title'] as String?,
            subtitle: extra?['subtitle'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/anando',
        builder: (context, state) => AnandoScreen(onOpenRide: (id) => context.push('/anando/$id')),
      ),
      GoRoute(
        path: '/anando/:id',
        builder: (context, state) => AnandoRideDetailScreen(rideId: int.parse(state.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/insurance',
        builder: (context, state) => InsuranceScreen(onPurchased: () => context.pushReplacement('/insurance/my-policies')),
      ),
      GoRoute(path: '/insurance/my-policies', builder: (context, state) => const MyPoliciesScreen()),
      GoRoute(
        path: '/deliveries',
        builder: (context, state) => MyDeliveriesScreen(
          onOpenDelivery: (id) => context.push('/deliveries/$id'),
          onNewDelivery: () => context.push('/deliveries/new'),
        ),
      ),
      GoRoute(
        path: '/deliveries/new',
        builder: (context, state) => NewDeliveryScreen(onSaved: (id) => context.pushReplacement('/deliveries/$id')),
      ),
      GoRoute(
        path: '/deliveries/:id/edit',
        builder: (context, state) => NewDeliveryScreen(
          deliveryId: int.parse(state.pathParameters['id']!),
          onSaved: (id) => context.pushReplacement('/deliveries/$id'),
        ),
      ),
      GoRoute(
        path: '/deliveries/:id',
        builder: (context, state) => DeliveryDetailScreen(
          deliveryId: int.parse(state.pathParameters['id']!),
          onEdit: (id) => context.push('/deliveries/$id/edit'),
        ),
      ),
      GoRoute(
        path: '/dem-legui/new',
        builder: (context, state) => NewDemLeguiRequestScreen(onCreated: (id) => context.pushReplacement('/dem-legui/requests/$id')),
      ),
      GoRoute(
        path: '/dem-legui/requests/:id',
        builder: (context, state) => DemLeguiRequestDetailScreen(
          requestId: int.parse(state.pathParameters['id']!),
          onOpenChat: (requestId, title, subtitle) =>
              context.push('/dem-legui/requests/$requestId/chat', extra: {'title': title, 'subtitle': subtitle}),
        ),
      ),
      GoRoute(
        path: '/dem-legui/requests/:requestId/chat',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return DemLeguiChatScreen(
            requestId: int.parse(state.pathParameters['requestId']!),
            title: extra?['title'] as String?,
            subtitle: extra?['subtitle'] as String?,
          );
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => _MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/',
                builder: (context, state) => HomeScreen(
                      onOpenTrip: (id) => context.push('/trips/$id'),
                      onOpenWallet: () => context.push('/wallet'),
                    )),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/services',
              builder: (context, state) => ServicesScreen(
                onOpenDemLegui: () => context.push('/dem-legui/new'),
                onOpenAnando: () => context.push('/anando'),
                onOpenLivraison: () => context.push('/deliveries/new'),
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/bookings',
                builder: (context, state) => MyBookingsScreen(
                      onOpenTrip: (id) => context.push('/trips/$id'),
                      onOpenChat: (bookingId, title, subtitle) =>
                          context.push('/chat/$bookingId', extra: {'title': title, 'subtitle': subtitle}),
                    )),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/profile',
                builder: (context, state) => ProfileScreen(
                      onOpenWallet: () => context.push('/wallet'),
                      onOpenSettings: () => context.push('/settings'),
                      onOpenDeliveries: () => context.push('/deliveries'),
                      onOpenInsurance: () => context.push('/insurance'),
                    )),
          ]),
        ],
      ),
    ],
  );
}
