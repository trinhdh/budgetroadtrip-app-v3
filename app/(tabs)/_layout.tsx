import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router'; // 1. Make sure useRouter is imported
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter(); // 2. Get the router

  const activeColor = theme.tint;
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 12,
      speed: 20,
    }).start();
  };

  const onFabPress = () => {
    // 3. Handle everything here directly
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-trip');
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          backgroundColor: theme.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="car" color={color} />
          ),
        }}
      />

      {/* CREATE TAB */}
      <Tabs.Screen
        name="create"
        listeners={{
          // 4. We can technically remove this listener now since we handle it in onPress below
          tabPress: (e) => {
            e.preventDefault(); // Keep this just in case the edge of the tab is clicked
          },
        }}
        options={{
          title: 'New',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Pressable
              onPress={onFabPress} // <--- Navigation is triggered here now
              onPressIn={() => animate(0.9)}
              onPressOut={() => animate(1)}
              style={({ pressed }) => [
                styles.fabContainer,
                { top: -15 },
              ]}
            >
              <Animated.View
                style={[
                  styles.fab,
                  {
                    backgroundColor: activeColor,
                    transform: [{ scale }],
                  },
                ]}
              >
                <IconSymbol size={28} name="plus" color="#fff" />
              </Animated.View>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="ellipsis.circle.fill" color={color} /> // Or 'gear'
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 8,
  },
});