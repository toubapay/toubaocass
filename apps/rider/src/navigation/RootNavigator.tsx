import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useNotifications';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  BookingsStackParamList,
  HomeStackParamList,
  MainTabParamList,
  MapStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const BookingsStackNav = createNativeStackNavigator<BookingsStackParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <AuthStack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen name="Home" component={HomeScreen} options={{ title: 'Trajets disponibles' }} />
      <HomeStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
    </HomeStackNav.Navigator>
  );
}

function BookingsNavigator() {
  return (
    <BookingsStackNav.Navigator>
      <BookingsStackNav.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Mes réservations' }} />
      <BookingsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
    </BookingsStackNav.Navigator>
  );
}

function MapNavigator() {
  return (
    <MapStackNav.Navigator>
      <MapStackNav.Screen name="Map" component={MapScreen} options={{ title: 'Carte des trajets' }} />
      <MapStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
    </MapStackNav.Navigator>
  );
}

function MainTabs() {
  useRegisterPushToken(true);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'HomeTab' ? 'home' : route.name === 'BookingsTab' ? 'ticket' : 'person';
          return <Ionicons name={icon as never} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Accueil' }} />
      <Tab.Screen name="BookingsTab" component={BookingsNavigator} options={{ title: 'Réservations' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : !user?.profile_complete ? (
        <ProfileSetupScreen />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}
