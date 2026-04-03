import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Platform,
  Dimensions,
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS, NavigationTheme } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

const { width } = Dimensions.get("window");
const iconSize = width < 375 ? 22 : 24;

// Ekranlar
import HomeScreen from "../screens/HomeScreen";
import DietPlanScreen from "../screens/DietPlanScreen";
import WeightAndBMIScreen from "../screens/WeightAndBMIScreen";
import TipsScreen from "../screens/TipsScreen";
import GoalsScreen from "../screens/GoalsScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MealCalorieScreen from "../screens/MealCalorieScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Auth Stack (Login/Register)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Tab Navigator (inner)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: COLORS.border,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 85 : 65,
          ...SHADOWS.medium,
        },
        tabBarLabelStyle: {
          fontSize: width < 375 ? 9 : 10,
          fontWeight: "600",
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
        headerShadowVisible: false,
        headerTintColor: COLORS.textOnPrimary,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: SIZES.h3,
          letterSpacing: -0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Ana Sayfa",
          tabBarLabel: "Ana Sayfa",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
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
          title: "Diyet Programım",
          tabBarLabel: "Diyetim",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "restaurant" : "restaurant-outline"}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="WeightAndBMI"
        component={WeightAndBMIScreen}
        options={{
          title: "Kilo ve VKİ",
          tabBarLabel: "Kilo & VKİ",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "fitness" : "fitness-outline"}
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
          title: "Hedeflerim",
          tabBarLabel: "Hedefler",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
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
          title: "Sağlık Tavsiyeleri",
          tabBarLabel: "Tavsiyeler",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bulb" : "bulb-outline"}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profilim",
          tabBarLabel: "Profil",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// App Stack (Tab Navigator + modallar / tam ekran yardımcılar)
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="MealCalorie"
        component={MealCalorieScreen}
        options={{
          headerShown: true,
          title: "Fotoğraftan kalori",
          // Sadece sol ok — "Geri" yazılı geniş hap görünümünü kaldırır (iOS Human Interface)
          headerBackButtonDisplayMode: "minimal",
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.textOnPrimary,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: SIZES.h3,
            letterSpacing: -0.3,
          },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

// Main Navigator
export default function MainNavigator() {
  const { user, loading, isGuest } = useAuth();

  const showMainApp = !!user || isGuest;

  return (
    <NavigationContainer theme={NavigationTheme}>
      {loading ? <LoadingScreen /> : showMainApp ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
