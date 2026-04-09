import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Platform,
  Dimensions,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, NavigationTheme } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

const { width } = Dimensions.get("window");
const iconSize = width < 375 ? 22 : 24;
const isSmallScreen = width < 375;

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

const TAB_ITEMS = {
  Home: {
    label: "Ana Sayfa",
    title: "Ana Sayfa",
    icon: "home-outline",
    activeIcon: "home",
  },
  DietPlan: {
    label: "Diyetim",
    title: "Diyet Programım",
    icon: "restaurant-outline",
    activeIcon: "restaurant",
  },
  WeightAndBMI: {
    label: "Kilo & VKİ",
    title: "Kilo ve VKİ",
    icon: "fitness-outline",
    activeIcon: "fitness",
  },
  Goals: {
    label: "Hedefler",
    title: "Hedeflerim",
    icon: "trophy-outline",
    activeIcon: "trophy",
  },
  Tips: {
    label: "Tavsiyeler",
    title: "Sağlık Tavsiyeleri",
    icon: "bulb-outline",
    activeIcon: "bulb",
  },
  Profile: {
    label: "Profil",
    title: "Profilim",
    icon: "person-outline",
    activeIcon: "person",
  },
};

function ModernTabIcon({ icon, activeIcon, color, focused }) {
  // Tek progress değeriyle hem scale hem arka planı sürüyoruz.
  // Bu yaklaşım native/js driver karışımı kaynaklı runtime hatasını önler.
  const progress = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: focused ? 220 : 150,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  const animatedBackgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", COLORS.highlight],
  });
  const animatedScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <Animated.View
      style={[
        styles.tabIconWrap,
        { backgroundColor: animatedBackgroundColor },
        { transform: [{ scale: animatedScale }] },
      ]}
    >
      <Ionicons name={focused ? activeIcon : icon} size={iconSize} color={color} />
    </Animated.View>
  );
}

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
  const renderTabLabel = ({ color, children }) => (
    <Text
      allowFontScaling={false}
      numberOfLines={2}
      ellipsizeMode="clip"
      style={[styles.tabBarLabel, { color }]}
    >
      {children}
    </Text>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabel: renderTabLabel,
        tabBarAllowFontScaling: false,
        tabBarItemStyle: styles.tabBarItem,
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
          title: TAB_ITEMS.Home.title,
          tabBarLabel: TAB_ITEMS.Home.label,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.Home.icon}
              activeIcon={TAB_ITEMS.Home.activeIcon}
              color={color}
              focused={focused}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="DietPlan"
        component={DietPlanScreen}
        options={{
          title: TAB_ITEMS.DietPlan.title,
          tabBarLabel: TAB_ITEMS.DietPlan.label,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.DietPlan.icon}
              activeIcon={TAB_ITEMS.DietPlan.activeIcon}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="WeightAndBMI"
        component={WeightAndBMIScreen}
        options={{
          title: TAB_ITEMS.WeightAndBMI.title,
          tabBarLabel: TAB_ITEMS.WeightAndBMI.label,
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.WeightAndBMI.icon}
              activeIcon={TAB_ITEMS.WeightAndBMI.activeIcon}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: TAB_ITEMS.Goals.title,
          tabBarLabel: TAB_ITEMS.Goals.label,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.Goals.icon}
              activeIcon={TAB_ITEMS.Goals.activeIcon}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tips"
        component={TipsScreen}
        options={{
          title: TAB_ITEMS.Tips.title,
          tabBarLabel: TAB_ITEMS.Tips.label,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.Tips.icon}
              activeIcon={TAB_ITEMS.Tips.activeIcon}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: TAB_ITEMS.Profile.title,
          tabBarLabel: TAB_ITEMS.Profile.label,
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <ModernTabIcon
              icon={TAB_ITEMS.Profile.icon}
              activeIcon={TAB_ITEMS.Profile.activeIcon}
              color={color}
              focused={focused}
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
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "ios" ? 12 : 10,
    height: Platform.OS === "ios" ? 84 : 76,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
    borderRadius: 28,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  tabBarItem: {
    borderRadius: 18,
    paddingHorizontal: 0,
    marginHorizontal: 1,
  },
  tabBarLabel: {
    fontSize: isSmallScreen ? 9 : 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: isSmallScreen ? 11 : 12,
    marginTop: 1,
    marginBottom: Platform.OS === "ios" ? 0 : 2,
    maxWidth: 58,
  },
  tabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
