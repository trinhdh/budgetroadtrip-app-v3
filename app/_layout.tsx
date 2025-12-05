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
import { SplashScreen, Stack, useRouter } from 'expo-router';
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

  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

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

  useEffect(() => {
    if (!ready) return;

    const initApp = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch { }

      if (!user) return router.replace('/login');
      if (hasOnboarded === false) return router.replace('/onboarding');
      return router.replace('/(tabs)');
    };

    initApp();
  }, [ready, user, hasOnboarded]);

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
