import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient'; // Import Gradient
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
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- MOCK DATA ---
const MOCK_TRIPS = [
  {
    id: '1',
    origin: 'Atlanta, GA',
    destination: 'New York City',
    startDate: 'Dec 01',
    endDate: 'Dec 05',
    status: 'Upcoming',
    budget: 1500,
    image: 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '2',
    origin: 'Seattle, WA',
    destination: 'Tokyo, Japan',
    startDate: 'Jan 10',
    endDate: 'Jan 24',
    status: 'Planning',
    budget: 3500,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '3',
    origin: 'San Fran, CA',
    destination: 'Las Vegas, NV',
    startDate: 'Feb 14',
    endDate: 'Feb 16',
    status: 'Confirmed',
    budget: 800,
    image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?q=80&w=1000&auto=format&fit=crop',
  },
];

// --- HERO IMAGES FOR EMPTY STATE ---
const HERO_IMAGES = [
  require('@/assets/images/empty1.jpg'),
  require('@/assets/images/empty2.jpg'),
  require('@/assets/images/empty3.jpg'),
];

const ROTATIONS = [-6, 8, -4];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [activeTab, setActiveTab] = useState<'Active' | 'Past'>('Active');
  const [userTrips, setUserTrips] = useState(MOCK_TRIPS);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'Active' && styles.activeToggleButton]}
            onPress={() => setActiveTab('Active')}>
            <ThemedText style={[styles.toggleText, activeTab === 'Active' && styles.activeToggleText]}>
              Active
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'Past' && styles.activeToggleButton]}
            onPress={() => setActiveTab('Past')}>
            <ThemedText style={[styles.toggleText, activeTab === 'Past' && styles.activeToggleText]}>
              Past
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {userTrips.length === 0 ? (
          /* --- EMPTY STATE (Polaroid Stack) --- */
          <View style={styles.emptyStateContainer}>
            <View style={styles.heroContainer}>
              {HERO_IMAGES.map((image, index) => {
                const isActive = index === activeImageIndex;
                const animatedStyle = useAnimatedStyle(() => ({
                  transform: [
                    { scale: withSpring(isActive ? 1 : 0.96) },
                    { rotate: `${ROTATIONS[index % ROTATIONS.length]}deg` }
                  ],
                  zIndex: isActive ? 10 : 1,
                  opacity: withTiming(isActive ? 1 : 0.8, { duration: 300 })
                }));
                return (
                  <Animated.View key={index} style={[styles.heroImageWrapper, animatedStyle]}>
                    <Image source={image} style={styles.heroImage} contentFit="cover" />
                  </Animated.View>
                );
              })}
            </View>
            <ThemedText type="title" style={styles.heroTitle}>Big trips, small budgets</ThemedText>
            <ThemedText style={styles.heroSubtitle}>Discover more without spending more</ThemedText>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/create-trip')}
              activeOpacity={0.8}>
              <ThemedText style={styles.ctaButtonText}>Create your first trip</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          /* --- LIST STATE (Immersive Cards) --- */
          <View style={styles.listContainer}>
            {userTrips.map((trip, index) => (
              <Animated.View
                key={trip.id}
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <TouchableOpacity
                  style={styles.immersiveCard}
                  activeOpacity={0.95}
                  onPress={() => router.push({
                    pathname: '/trip-details/[id]',
                    params: { id: trip.id }
                  })}
                >
                  {/* Full Background Image */}
                  <Image source={{ uri: trip.image }} style={StyleSheet.absoluteFill} contentFit="cover" />

                  {/* Gradient Overlay for Readability */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.cardOverlay}
                  />

                  {/* Top Row: Status & Budget */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.statusBadge, { backgroundColor: colors.tint }]}>
                      <ThemedText style={styles.statusText}>{trip.status}</ThemedText>
                    </View>
                    <View style={styles.budgetBadge}>
                      <ThemedText style={styles.budgetText}>${trip.budget}</ThemedText>
                    </View>
                  </View>

                  {/* Bottom Content */}
                  <View style={styles.cardBottomContent}>
                    <View>
                      <ThemedText style={styles.dateText}>{trip.startDate} - {trip.endDate}</ThemedText>
                      <ThemedText style={styles.destinationTitle}>{trip.destination}</ThemedText>
                    </View>

                    <View style={styles.arrowButton}>
                      <IconSymbol name="chevron.right" size={20} color="#fff" />
                    </View>
                  </View>

                </TouchableOpacity>
              </Animated.View>
            ))}
            <View style={{ height: 100 }} />
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
    marginBottom: 24,
  },
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
  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 100,
  },
  heroContainer: {
    width: 250,
    height: 320,
    marginBottom: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageWrapper: {
    position: 'absolute',
    width: 240,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  heroImage: { width: '100%', height: '100%' },
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
  ctaButtonText: { color: '#fff', fontSize: 18, fontFamily: Fonts.bold },

  // --- LIST STYLES ---
  listContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  immersiveCard: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#000', // Fallback color
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%', // Gradients over bottom 60%
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  budgetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  budgetText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardBottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  destinationTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: Fonts.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  }
});