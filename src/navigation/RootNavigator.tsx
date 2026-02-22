// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthScreen from '../screens/AuthScreen';
import WishlistsScreen from '../screens/WishlistsScreen';
import WishlistDetailsScreen from '../screens/WishlistDetailsScreen';
import ReservationScreen from '../screens/ReservationScreen';

export type RootStackParamList = {
  Auth: undefined;
  Wishlists: undefined;
  WishlistDetails: {
    wishlistId: string;
    title: string;
    ownerId: string;
    eventDate: string | null;
    isPublic: boolean;
  };
  Reservation: { itemId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { session, isLoading, signOut } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (isLoading) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  const cycleTheme = () => {
    if (theme === 'system') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('system');
  };

  const themeIcon = theme === 'system' ? 'A' : theme === 'dark' ? '☾' : '☀︎';

  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      <TouchableOpacity style={styles.themeButton} onPress={cycleTheme}>
        <Text style={styles.themeButtonText}>{themeIcon}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <NavigationContainer>
      {session ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? '#020617' : '#E5F0FF',
            },
            headerTintColor: isDark ? '#F9FAFB' : '#111827',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen
            name="Wishlists"
            component={WishlistsScreen}
            options={{
              title: 'Мои вишлисты',
              headerRight: renderHeaderRight,
            }}
          />
          <Stack.Screen
            name="WishlistDetails"
            component={WishlistDetailsScreen}
            options={{
              title: 'Список желаний',
              headerRight: renderHeaderRight,
            }}
          />
          <Stack.Screen
            name="Reservation"
            component={ReservationScreen}
            options={{
              title: 'Резерв',
              headerRight: renderHeaderRight,
            }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeButton: {
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#020617',
  },
  themeButtonText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default RootNavigator;