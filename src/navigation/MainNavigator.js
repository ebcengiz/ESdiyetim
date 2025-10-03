import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

// Ekranlar
import HomeScreen from '../screens/HomeScreen';
import DietPlanScreen from '../screens/DietPlanScreen';
import WeightTrackerScreen from '../screens/WeightTrackerScreen';
import BodyInfoScreen from '../screens/BodyInfoScreen';
import TipsScreen from '../screens/TipsScreen';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopWidth: 0,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 85 : 65,
            ...SHADOWS.large,
          },
          tabBarLabelStyle: {
            fontSize: SIZES.tiny,
            fontWeight: '700',
          },
          headerStyle: {
            backgroundColor: COLORS.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: COLORS.textOnPrimary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: SIZES.h3,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Ana Sayfa',
            tabBarLabel: 'Ana Sayfa',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="DietPlan"
          component={DietPlanScreen}
          options={{
            title: 'Diyet Programım',
            tabBarLabel: 'Diyetim',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'restaurant' : 'restaurant-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="WeightTracker"
          component={WeightTrackerScreen}
          options={{
            title: 'Kilo Takibi',
            tabBarLabel: 'Kilom',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'fitness' : 'fitness-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="BodyInfo"
          component={BodyInfoScreen}
          options={{
            title: 'Vücut Bilgilerim',
            tabBarLabel: 'VKİ',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'body' : 'body-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Tips"
          component={TipsScreen}
          options={{
            title: 'Sağlık Tavsiyeleri',
            tabBarLabel: 'Tavsiyeler',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bulb' : 'bulb-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}