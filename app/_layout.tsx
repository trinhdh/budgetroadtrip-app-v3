import { AuthProvider, useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig'; // Import db
import { useColorScheme } from '@/hooks/use-color-scheme'; // Fixed import order
import { registerForPushNotificationsAsync } from '@/services/notification'; // Import notification service
import { Rubik_400Regular, Rubik_500Medium, Rubik_700Bold, useFonts } from '@expo-google-fonts/rubik';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // 1. Get Auth State
  const { user, loading: authLoading } = useAuth();

  // 2. Local state for Onboarding check
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });

  // Check Onboarding Status
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(value === 'true');
      } catch (e) {
        console.warn(e);
      } finally {
        setIsOnboardingChecked(true);
      }
    }
    checkOnboarding();
  }, []);

  // --- NEW: Handle Push Notification Registration ---
  useEffect(() => {
    const setupNotifications = async () => {
      if (user) {
        // Only attempt to register if we have a logged-in user
        const token = await registerForPushNotificationsAsync();

        if (token) {
          // Save the token to the user's document in Firestore
          // merge: true ensures we don't overwrite existing user data (like name/email)
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { expoPushToken: token }, { merge: true });
            console.log("Push token saved to Firebase for user:", user.uid);
          } catch (error) {
            console.error("Error saving push token:", error);
          }
        }
      }
    };

    // Run this whenever the user state changes (e.g., logs in)
    setupNotifications();
  }, [user]);


  // Handle Redirects & Splash Screen
  useEffect(() => {
    const isReady = fontsLoaded && !authLoading && isOnboardingChecked;

    if (isReady) {
      SplashScreen.hideAsync();

      // Priority 1: Authentication
      if (!user) {
        router.replace('/login');
        return;
      }

      // Priority 2: Onboarding (Only if user is logged in)
      if (hasOnboarded === false) {
        router.replace('/onboarding');
        return;
      }

      // Priority 3: Main App (If user is logged in & onboarded)
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, authLoading, isOnboardingChecked, user, hasOnboarded]);

  // Don't render anything until we are ready
  if (!fontsLoaded || authLoading || !isOnboardingChecked) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />

        <Stack.Screen name="create-trip" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="trip-details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="trip-details/day-details" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Wrap the Nav in the Provider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}