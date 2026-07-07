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
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { TripResultsScreen } from '../screens/TripResultsScreen';
import { colors } from '../theme';
import {
  AuthStackParamList,
  BookingsStackParamList,
  MainTabParamList,
  SearchStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const BookingsStackNav = createNativeStackNavigator<BookingsStackParamList>();
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

function SearchNavigator() {
  return (
    <SearchStackNav.Navigator>
      <SearchStackNav.Screen name="Search" component={SearchScreen} options={{ title: 'Find a ride' }} />
      <SearchStackNav.Screen name="TripResults" component={TripResultsScreen} options={{ title: 'Available rides' }} />
      <SearchStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Trip details' }} />
    </SearchStackNav.Navigator>
  );
}

function BookingsNavigator() {
  return (
    <BookingsStackNav.Navigator>
      <BookingsStackNav.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My bookings' }} />
      <BookingsStackNav.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Trip details' }} />
    </BookingsStackNav.Navigator>
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
            route.name === 'SearchTab' ? 'search' : route.name === 'BookingsTab' ? 'ticket' : 'person';
          return <Ionicons name={icon as never} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="SearchTab" component={SearchNavigator} options={{ title: 'Search' }} />
      <Tab.Screen name="BookingsTab" component={BookingsNavigator} options={{ title: 'Bookings' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
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
