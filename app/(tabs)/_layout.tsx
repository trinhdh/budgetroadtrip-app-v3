import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const activeColor = theme.tint;

  // Animation value
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        // Remove custom tabBarButton for FAB only
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          backgroundColor: theme.background,
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* FAB MIDDLE BUTTON */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'New',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Pressable
              onPress={onFabPress}
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

      {/* EXPLORE */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
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
