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
import { ChatScreen } from '../screens/ChatScreen';
import { AddCarScreen } from '../screens/fleet/AddCarScreen';
import { CarsListScreen } from '../screens/fleet/CarsListScreen';
import { KycFormScreen } from '../screens/kyc/KycFormScreen';
import { KycStatusScreen } from '../screens/kyc/KycStatusScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PostTripScreen } from '../screens/trips/PostTripScreen';
import { TripDetailScreen } from '../screens/trips/TripDetailScreen';
import { TripsListScreen } from '../screens/trips/TripsListScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  FleetStackParamList,
  KycStackParamList,
  MainTabParamList,
  TripsStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const TripsStackNav = createNativeStackNavigator<TripsStackParamList>();
const FleetStackNav = createNativeStackNavigator<FleetStackParamList>();
const KycStackNav = createNativeStackNavigator<KycStackParamList>();
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

function TripsNavigator() {
  return (
    <TripsStackNav.Navigator>
      <TripsStackNav.Screen name="TripsList" component={TripsListScreen} options={{ title: 'Mes trajets' }} />
      <TripsStackNav.Screen name="PostTrip" component={PostTripScreen} options={{ title: 'Publier un trajet' }} />
      <TripsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Détails du trajet' }} />
      <TripsStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Discussion' }} />
    </TripsStackNav.Navigator>
  );
}

function FleetNavigator() {
  return (
    <FleetStackNav.Navigator>
      <FleetStackNav.Screen name="CarsList" component={CarsListScreen} options={{ title: 'Mes véhicules' }} />
      <FleetStackNav.Screen name="AddCar" component={AddCarScreen} options={{ title: 'Ajouter un véhicule' }} />
    </FleetStackNav.Navigator>
  );
}

function KycNavigator() {
  return (
    <KycStackNav.Navigator>
      <KycStackNav.Screen name="KycStatus" component={KycStatusScreen} options={{ title: 'Vérification' }} />
      <KycStackNav.Screen name="KycForm" component={KycFormScreen} options={{ title: 'Soumettre les documents' }} />
    </KycStackNav.Navigator>
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
            route.name === 'TripsTab'
              ? 'car'
              : route.name === 'FleetTab'
                ? 'car-sport'
                : route.name === 'KycTab'
                  ? 'shield-checkmark'
                  : 'person';
          return <Ionicons name={icon as never} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="TripsTab" component={TripsNavigator} options={{ title: 'Trajets' }} />
      <Tab.Screen name="FleetTab" component={FleetNavigator} options={{ title: 'Flotte' }} />
      <Tab.Screen name="KycTab" component={KycNavigator} options={{ title: 'Vérification' }} />
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
