import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Replace these with your actual travel photos
const HERO_IMAGES = [
  require('@/assets/images/empty1.jpg'), // Photo 1
  require('@/assets/images/empty2.jpg'), // Photo 2
  require('@/assets/images/empty3.jpg'), // Photo 3
];

// Fixed rotations for the "scattered" look
const ROTATIONS = [-6, 8, -4];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [activeTab, setActiveTab] = useState<'Active' | 'Past'>('Active');
  const [userTrips, setUserTrips] = useState([]);

  // Carousel State
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Auto-switch images every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* 1. Custom Header */}
      <View style={styles.header}>
        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'Active' && styles.activeToggleButton,
            ]}
            onPress={() => setActiveTab('Active')}>
            <ThemedText
              style={[
                styles.toggleText,
                activeTab === 'Active' && styles.activeToggleText,
              ]}>
              Active
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'Past' && styles.activeToggleButton,
            ]}
            onPress={() => setActiveTab('Past')}>
            <ThemedText
              style={[
                styles.toggleText,
                activeTab === 'Past' && styles.activeToggleText,
              ]}>
              Past
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {userTrips.length === 0 ? (
          /* 2. Empty State Content */
          <View style={styles.emptyStateContainer}>

            {/* Scattered Image Stack */}
            <View style={styles.heroContainer}>
              {HERO_IMAGES.map((image, index) => {
                const isActive = index === activeImageIndex;

                // Animated Style for Shuffle Effect
                const animatedStyle = useAnimatedStyle(() => {
                  return {
                    // Animate Scale: Active pops up, others shrink slightly
                    transform: [
                      { scale: withSpring(isActive ? 1 : 0.96) },
                      { rotate: `${ROTATIONS[index % ROTATIONS.length]}deg` } // Keep static rotation
                    ],
                    // Animate Z-Index: Active sits on top
                    zIndex: isActive ? 10 : 1,
                    // Optional: slight opacity drop for background cards
                    opacity: withTiming(isActive ? 1 : 0.8, { duration: 300 })
                  };
                });

                return (
                  <Animated.View
                    key={index}
                    style={[styles.heroImageWrapper, animatedStyle]}
                  >
                    <Image
                      source={image}
                      style={styles.heroImage}
                      contentFit="cover"
                    />
                  </Animated.View>
                );
              })}
            </View>

            <ThemedText type="title" style={styles.heroTitle}>
              Big trips, small budgets
            </ThemedText>

            <ThemedText style={styles.heroSubtitle}>
              Discover more without spending more
            </ThemedText>

            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/create-trip')}
              activeOpacity={0.8}>
              <ThemedText style={styles.ctaButtonText}>
                Create your first trip
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          /* List of Trips (Coming Soon) */
          <View>
            <ThemedText>List of trips will go here...</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  // Toggle Styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    borderRadius: 30,
    padding: 4,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  activeToggleButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: '#808080',
    fontFamily: Fonts.medium,
  },
  activeToggleText: {
    color: '#000',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 100,
  },

  // --- CAROUSEL STYLES ---
  heroContainer: {
    width: 250,
    height: 320, // Increased height to accommodate rotation
    marginBottom: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageWrapper: {
    position: 'absolute',
    width: 240,  // Fixed width for the card look
    height: 280, // Fixed height
    borderRadius: 24,
    overflow: 'hidden',
    // White Border effect
    borderWidth: 6,
    borderColor: '#fff',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroTitle: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: Fonts.bold,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#808080',
    marginBottom: 40,
    lineHeight: 24,
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
});