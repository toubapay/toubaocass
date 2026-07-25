import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MyLocationBar } from '../components/MyLocationBar';
import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useNotifications';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { AnandoRideDetailScreen } from '../screens/AnandoRideDetailScreen';
import { AnandoScreen } from '../screens/AnandoScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DemLeguiRequestDetailScreen } from '../screens/DemLeguiRequestDetailScreen';
import { DeliveryDetailScreen } from '../screens/DeliveryDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InstantDeparturesScreen } from '../screens/InstantDeparturesScreen';
import { MapScreen } from '../screens/MapScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { MyDeliveriesScreen } from '../screens/MyDeliveriesScreen';
import { NewDeliveryScreen } from '../screens/NewDeliveryScreen';
import { NewDemLeguiRequestScreen } from '../screens/NewDemLeguiRequestScreen';
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
  const { t } = useTranslation();
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('nav.screenTitles.home'),
          headerRight: () => <MyLocationBar />,
        }}
      />
      <HomeStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: t('nav.screenTitles.tripDetail') }} />
      <HomeStackNav.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.screenTitles.chat') }} />
      <HomeStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: t('nav.screenTitles.wallet') }} />
      <HomeStackNav.Screen name="Map" component={MapScreen} options={{ title: t('nav.screenTitles.map') }} />
      <HomeStackNav.Screen name="InstantDepartures" component={InstantDeparturesScreen} options={{ title: t('nav.screenTitles.instantDepartures') }} />
    </HomeStackNav.Navigator>
  );
}

function BookingsNavigator() {
  const { t } = useTranslation();
  return (
    <BookingsStackNav.Navigator>
      <BookingsStackNav.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: t('nav.screenTitles.myBookings') }} />
      <BookingsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: t('nav.screenTitles.tripDetail') }} />
      <BookingsStackNav.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.screenTitles.chat') }} />
    </BookingsStackNav.Navigator>
  );
}

function ServicesNavigator() {
  const { t } = useTranslation();
  return (
    <ServicesStackNav.Navigator>
      <ServicesStackNav.Screen
        name="Services"
        component={ServicesScreen}
        options={({ navigation }) => ({
          title: t('nav.screenTitles.services'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('MyDeliveries')}>
              <Ionicons name="receipt-outline" size={22} color={colors.accent} />
            </Pressable>
          ),
        })}
      />
      <ServicesStackNav.Screen name="NewDelivery" component={NewDeliveryScreen} options={{ title: t('nav.screenTitles.newDelivery') }} />
      <ServicesStackNav.Screen name="MyDeliveries" component={MyDeliveriesScreen} options={{ title: t('nav.screenTitles.myDeliveries') }} />
      <ServicesStackNav.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: t('nav.screenTitles.deliveryDetail') }} />
      <ServicesStackNav.Screen name="Anando" component={AnandoScreen} options={{ title: t('nav.screenTitles.anando') }} />
      <ServicesStackNav.Screen name="AnandoRideDetail" component={AnandoRideDetailScreen} options={{ title: t('nav.screenTitles.anandoRideDetail') }} />
      <ServicesStackNav.Screen name="NewDemLeguiRequest" component={NewDemLeguiRequestScreen} options={{ title: t('nav.screenTitles.demLegui') }} />
      <ServicesStackNav.Screen name="DemLeguiRequestDetail" component={DemLeguiRequestDetailScreen} options={{ title: t('nav.screenTitles.demLeguiRequestDetail') }} />
    </ServicesStackNav.Navigator>
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
            TAB_ICONS[route.name as keyof MainTabParamList] ?? 'ellipse';
          return <Ionicons name={icon} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: t('nav.home') }} />
      <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{ title: t('nav.services') }} />
      <Tab.Screen name="BookingsTab" component={BookingsNavigator} options={{ title: t('nav.bookings') }} />
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
