import { Rubik_400Regular, Rubik_500Medium, Rubik_700Bold, useFonts } from '@expo-google-fonts/rubik';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router'; // Added useRouter
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false); // Track if app is ready
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });

  useEffect(() => {
    // Check onboarding status and ensure fonts are loaded
    async function prepare() {
      try {
        const value = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(value === 'true');
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Only hide splash screen when fonts AND logic are ready
    if (fontsLoaded && isReady) {
      SplashScreen.hideAsync();

      // Redirect logic: If not onboarded, go to onboarding
      if (hasOnboarded === false) {
        router.replace('/onboarding');
      }
    }
  }, [fontsLoaded, isReady, hasOnboarded]);

  if (!fontsLoaded || !isReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Make sure the header is hidden for onboarding */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}