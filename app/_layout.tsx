import { AuthProvider, useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerForPushNotificationsAsync } from '@/services/notification';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  useFonts,
} from '@expo-google-fonts/rubik';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
// IMPORTANT: only do this once in _layout.tsx
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [isAppReady, setIsAppReady] = useState(false); // Track if we've handled the initial load

  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });

  // Onboarding
  useEffect(() => {
    async function loadOnboarding() {
      const value = await AsyncStorage.getItem('hasOnboarded');
      setHasOnboarded(value === 'true');
      setIsOnboardingChecked(true);
    }
    loadOnboarding();
  }, []);

  // Push notifications
  useEffect(() => {
    if (!user) return;

    const saveToken = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      await setDoc(doc(db, 'users', user.uid), { expoPushToken: token }, { merge: true });
    };

    saveToken();
  }, [user]);

  const ready = fontsLoaded && !authLoading && isOnboardingChecked;

  // 1. HIDE SPLASH SCREEN (Run only when ready changes)
  useEffect(() => {
    if (ready && !isAppReady) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore error if it's already hidden
      });
      setIsAppReady(true);
    }
  }, [ready, isAppReady]);

  // 2. NAVIGATION (Run whenever auth state or readiness changes)
  useEffect(() => {
    if (!isAppReady) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'trip-details';
    // ^^^ Check if user is already in the "App" part

    if (!user) {
      // If not logged in, always go to login
      router.replace('/login');
    } else if (hasOnboarded === false) {
      router.replace('/onboarding');
    } else if (!inAuthGroup) {
      // ONLY redirect to Tabs if they are currently in a public area (Login/Onboarding)
      // If they opened a Deep Link to '/trip-details/123', 'inAuthGroup' will be true, 
      // so we DO NOT redirect, letting the Deep Link work!
      router.replace('/(tabs)');
    }
  }, [isAppReady, user, hasOnboarded]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="create-trip" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="email-login" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="trip-details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="trip-details/day-details" options={{ headerShown: false }} />
        <Stack.Screen name="trip-details/expense" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="trip-details/activity" options={{ presentation: 'modal', headerShown: false }} />

      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}