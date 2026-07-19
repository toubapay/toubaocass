import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { MyLocationBar } from '../components/MyLocationBar';
import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useNotifications';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DeliveryDetailScreen } from '../screens/DeliveryDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InstantDeparturesScreen } from '../screens/InstantDeparturesScreen';
import { MapScreen } from '../screens/MapScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { MyDeliveriesScreen } from '../screens/MyDeliveriesScreen';
import { NewDeliveryScreen } from '../screens/NewDeliveryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  BookingsStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  ServicesStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const BookingsStackNav = createNativeStackNavigator<BookingsStackParamList>();
const ServicesStackNav = createNativeStackNavigator<ServicesStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  ServicesTab: 'apps',
  BookingsTab: 'ticket',
  ProfileTab: 'person',
};

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
        options={{
          title: 'Choisissez votre Destination',
          headerRight: () => <MyLocationBar />,
        }}
      />
      <HomeStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
      <HomeStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Discussion' }} />
      <HomeStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: 'Mon portefeuille' }} />
      <HomeStackNav.Screen name="Map" component={MapScreen} options={{ title: 'Carte des trajets' }} />
      <HomeStackNav.Screen name="InstantDepartures" component={InstantDeparturesScreen} options={{ title: 'Départs immédiats' }} />
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

function ServicesNavigator() {
  return (
    <ServicesStackNav.Navigator>
      <ServicesStackNav.Screen
        name="Services"
        component={ServicesScreen}
        options={({ navigation }) => ({
          title: 'Services',
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('MyDeliveries')}>
              <Ionicons name="receipt-outline" size={22} color={colors.accent} />
            </Pressable>
          ),
        })}
      />
      <ServicesStackNav.Screen name="NewDelivery" component={NewDeliveryScreen} options={{ title: 'Nouvelle livraison' }} />
      <ServicesStackNav.Screen name="MyDeliveries" component={MyDeliveriesScreen} options={{ title: 'Mes livraisons' }} />
      <ServicesStackNav.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: 'Détails de la livraison' }} />
    </ServicesStackNav.Navigator>
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
            TAB_ICONS[route.name as keyof MainTabParamList] ?? 'ellipse';
          return <Ionicons name={icon} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Accueil' }} />
      <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{ title: 'Services' }} />
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
