import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const [activeTab, setActiveTab] = useState<'Active' | 'Past'>('Active');

  // Placeholder for future data fetching
  const [userTrips, setUserTrips] = useState([]);

  return (
    <ThemedView style={styles.container}>
      {/* 1. Custom Header */}
      <View style={styles.header}>
        {/* Toggle Switch (Active / Past) */}
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

        {/* Plus Button (Top Right) */}
        <TouchableOpacity
          onPress={() => router.push('/create-trip')}
          style={[styles.circleButton, { backgroundColor: colors.tint }]}>
          <IconSymbol name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {userTrips.length === 0 ? (
          /* 2. Empty State Content */
          <View style={styles.emptyStateContainer}>
            {/* Image Placeholder - Replace this source with your collage image */}
            <Image
              source={require('@/assets/images/react-logo.png')}
              style={styles.heroImage}
              contentFit="contain"
            />

            <ThemedText type="title" style={styles.heroTitle}>
              When if not today?
            </ThemedText>

            <ThemedText style={styles.heroSubtitle}>
              It's time to start a new adventure
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
    backgroundColor: '#F2F2F2', // Light grey background for the pill
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
    color: '#000', // Active text color
  },
  // Circle Button
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content Styles
  scrollContent: {
    flexGrow: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 100, // Move content slightly up visually
  },
  heroImage: {
    width: 250,
    height: 250,
    marginBottom: 30,
    opacity: 0.8, // Adjust opacity if using the placeholder logo
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