import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { WalletHeaderButton } from '../components/WalletHeaderButton';
import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useNotifications';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  BookingsStackParamList,
  HomeStackParamList,
  MainTabParamList,
  MapStackParamList,
  ProfileStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const BookingsStackNav = createNativeStackNavigator<BookingsStackParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
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
      <HomeStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Choisissez votre Destination',
          headerRight: () => <WalletHeaderButton onPress={() => navigation.navigate('Wallet')} />,
        })}
      />
      <HomeStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
      <HomeStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Discussion' }} />
      <HomeStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: 'Mon portefeuille' }} />
    </HomeStackNav.Navigator>
  );
}

function BookingsNavigator() {
  return (
    <BookingsStackNav.Navigator>
      <BookingsStackNav.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Mes réservations' }} />
      <BookingsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
      <BookingsStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Discussion' }} />
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

function ProfileNavigator() {
  return (
    <ProfileStackNav.Navigator>
      <ProfileStackNav.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mon profil' }} />
      <ProfileStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: 'Mon portefeuille' }} />
      <ProfileStackNav.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
    </ProfileStackNav.Navigator>
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
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profil' }} />
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
