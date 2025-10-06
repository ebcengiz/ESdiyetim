import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const iconSize = width < 375 ? 22 : 24;

// Ekranlar
import HomeScreen from '../screens/HomeScreen';
import DietPlanScreen from '../screens/DietPlanScreen';
import WeightTrackerScreen from '../screens/WeightTrackerScreen';
import BodyInfoScreen from '../screens/BodyInfoScreen';
import TipsScreen from '../screens/TipsScreen';
import GoalsScreen from '../screens/GoalsScreen';

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
            fontSize: width < 375 ? 9 : 10,
            fontWeight: '600',
            marginTop: 2,
            marginBottom: 2,
          },
          tabBarAllowFontScaling: false,
          tabBarItemStyle: {
            paddingHorizontal: 0,
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={iconSize}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'restaurant' : 'restaurant-outline'}
                size={iconSize}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'fitness' : 'fitness-outline'}
                size={iconSize}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Goals"
          component={GoalsScreen}
          options={{
            title: 'Hedeflerim',
            tabBarLabel: 'Hedefler',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'trophy' : 'trophy-outline'}
                size={iconSize}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'body' : 'body-outline'}
                size={iconSize}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'bulb' : 'bulb-outline'}
                size={iconSize}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}