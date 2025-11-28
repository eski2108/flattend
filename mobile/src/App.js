import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { COLORS } from './config/colors';

// Screens
import WelcomeScreen from './screens/Auth/WelcomeScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';
import MarketsScreen from './screens/Markets/MarketsScreen';
import MarketplaceScreen from './screens/Marketplace/MarketplaceListScreen';
import CreateOfferScreen from './screens/Marketplace/CreateOfferScreen';
import PreviewOrderScreen from './screens/Trade/PreviewOrderScreen';
import TradeScreen from './screens/Trade/TradeScreen';
import MyOrdersScreen from './screens/Orders/MyOrdersScreen';
import WalletScreen from './screens/Wallet/WalletScreen';
import ReferralScreen from './screens/Referrals/ReferralScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import KYCVerificationScreen from './screens/Settings/KYCVerificationScreen';
import CurrencySelectorScreen from './screens/Settings/CurrencySelectorScreen';
import PriceTicker from './components/PriceTicker';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Markets') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'My Orders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Referrals') {
            iconName = focused ? 'gift' : 'gift-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Markets" 
        component={MarketsScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
      <Tab.Screen 
        name="My Orders" 
        component={MyOrdersScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
      <Tab.Screen 
        name="Referrals" 
        component={ReferralScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          header: () => <PriceTicker />
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="CreateOffer" component={CreateOfferScreen} options={{ title: 'Create Sell Offer' }} />
      <Stack.Screen name="PreviewOrder" component={PreviewOrderScreen} options={{ title: 'Preview Order' }} />
      <Stack.Screen name="Trade" component={TradeScreen} options={{ title: 'Trade Details' }} />
      <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ title: 'KYC Verification' }} />
      <Stack.Screen name="CurrencySelector" component={CurrencySelectorScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <CurrencyProvider>
      <AuthProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <Navigation />
      </AuthProvider>
    </CurrencyProvider>
  );
};

export default App;
