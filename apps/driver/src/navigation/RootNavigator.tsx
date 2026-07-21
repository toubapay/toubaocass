import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MyLocationBar } from '../components/MyLocationBar';
import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useNotifications';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DeliveryDetailScreen } from '../screens/deliveries/DeliveryDetailScreen';
import { DeliveriesListScreen } from '../screens/deliveries/DeliveriesListScreen';
import { AddCarScreen } from '../screens/fleet/AddCarScreen';
import { CarsListScreen } from '../screens/fleet/CarsListScreen';
import { InsuranceCompareScreen } from '../screens/insurance/InsuranceCompareScreen';
import { MyPoliciesScreen } from '../screens/insurance/MyPoliciesScreen';
import { KycFormScreen } from '../screens/kyc/KycFormScreen';
import { KycStatusScreen } from '../screens/kyc/KycStatusScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PostInstantTripScreen } from '../screens/trips/PostInstantTripScreen';
import { PostTripScreen } from '../screens/trips/PostTripScreen';
import { TripDetailScreen } from '../screens/trips/TripDetailScreen';
import { TripsListScreen } from '../screens/trips/TripsListScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  DeliveriesStackParamList,
  FleetStackParamList,
  KycStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  TripsStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const TripsStackNav = createNativeStackNavigator<TripsStackParamList>();
const DeliveriesStackNav = createNativeStackNavigator<DeliveriesStackParamList>();
const FleetStackNav = createNativeStackNavigator<FleetStackParamList>();
const KycStackNav = createNativeStackNavigator<KycStackParamList>();
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

function TripsNavigator() {
  const { t } = useTranslation();
  return (
    <TripsStackNav.Navigator>
      <TripsStackNav.Screen
        name="TripsList"
        component={TripsListScreen}
        options={{
          title: t('nav.screenTitles.tripsList'),
          headerRight: () => <MyLocationBar />,
        }}
      />
      <TripsStackNav.Screen name="PostTrip" component={PostTripScreen} options={{ title: t('nav.screenTitles.postTrip') }} />
      <TripsStackNav.Screen
        name="PostInstantTrip"
        component={PostInstantTripScreen}
        options={{ title: t('nav.screenTitles.postInstantTrip') }}
      />
      <TripsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: t('nav.screenTitles.tripDetail') }} />
      <TripsStackNav.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.screenTitles.chat') }} />
      <TripsStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: t('nav.screenTitles.wallet') }} />
    </TripsStackNav.Navigator>
  );
}

function DeliveriesNavigator() {
  const { t } = useTranslation();
  return (
    <DeliveriesStackNav.Navigator>
      <DeliveriesStackNav.Screen name="DeliveriesList" component={DeliveriesListScreen} options={{ title: t('nav.screenTitles.deliveriesList') }} />
      <DeliveriesStackNav.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: t('nav.screenTitles.deliveryDetail') }} />
    </DeliveriesStackNav.Navigator>
  );
}

function FleetNavigator() {
  const { t } = useTranslation();
  return (
    <FleetStackNav.Navigator>
      <FleetStackNav.Screen name="CarsList" component={CarsListScreen} options={{ title: t('nav.screenTitles.carsList') }} />
      <FleetStackNav.Screen name="AddCar" component={AddCarScreen} options={{ title: t('nav.screenTitles.addCar') }} />
      <FleetStackNav.Screen name="InsuranceCompare" component={InsuranceCompareScreen} options={{ title: t('nav.screenTitles.insuranceCompare') }} />
      <FleetStackNav.Screen name="MyPolicies" component={MyPoliciesScreen} options={{ title: t('nav.screenTitles.myPolicies') }} />
    </FleetStackNav.Navigator>
  );
}

function KycNavigator() {
  const { t } = useTranslation();
  return (
    <KycStackNav.Navigator>
      <KycStackNav.Screen name="KycStatus" component={KycStatusScreen} options={{ title: t('nav.screenTitles.kycStatus') }} />
      <KycStackNav.Screen name="KycForm" component={KycFormScreen} options={{ title: t('nav.screenTitles.kycForm') }} />
    </KycStackNav.Navigator>
  );
}

function ProfileNavigator() {
  const { t } = useTranslation();
  return (
    <ProfileStackNav.Navigator>
      <ProfileStackNav.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.screenTitles.profile') }} />
      <ProfileStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: t('nav.screenTitles.wallet') }} />
      <ProfileStackNav.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.screenTitles.settings') }} />
    </ProfileStackNav.Navigator>
  );
}

function MainTabs() {
  useRegisterPushToken(true);
  const { t } = useTranslation();

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
              : route.name === 'DeliveriesTab'
                ? 'cube'
                : route.name === 'FleetTab'
                  ? 'car-sport'
                  : route.name === 'KycTab'
                    ? 'shield-checkmark'
                    : 'person';
          return <Ionicons name={icon as never} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="TripsTab" component={TripsNavigator} options={{ title: t('nav.trips') }} />
      <Tab.Screen name="DeliveriesTab" component={DeliveriesNavigator} options={{ title: t('nav.deliveries') }} />
      <Tab.Screen name="FleetTab" component={FleetNavigator} options={{ title: t('nav.fleet') }} />
      <Tab.Screen name="KycTab" component={KycNavigator} options={{ title: t('nav.kyc') }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: t('nav.profile') }} />
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
