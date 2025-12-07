import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

// --- IMPORTS ---
import { useAuth } from '@/context/AuthContext';
import { TripService } from '@/services/trip-service';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HERO_IMAGES = [
  require('@/assets/images/empty1.jpg'),
  require('@/assets/images/empty2.jpg'),
  require('@/assets/images/empty3.jpg'),
];

const ROTATIONS = [-6, 8, -4];

// --- 1. HERO IMAGE CARD COMPONENT ---
const HeroImageCard = ({
  image,
  index,
  activeImageIndex
}: {
  image: any;
  index: number;
  activeImageIndex: number;
}) => {
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
    <Animated.View style={[styles.heroImageWrapper, animatedStyle]}>
      <Image source={image} style={styles.heroImage} contentFit="cover" />
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  // Updated Tab State
  const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'Past'>('Upcoming');
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // --- FETCH TRIPS VIA SERVICE ---
  useEffect(() => {
    if (!user) return;

    const unsubscribe = TripService.subscribeToUserTrips(user.uid, (trips) => {

      const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      const formattedTrips = trips.map((trip) => ({
        ...trip,
        formattedStartDate: formatDate(trip.startDate),
        formattedEndDate: trip.endDate ? formatDate(trip.endDate) : '...',
        image: trip.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop&sig=${trip.id}`,

        // Helper dates for filtering logic
        start: trip.startDate ? new Date(trip.startDate) : new Date(),
        end: trip.endDate ? new Date(trip.endDate) : new Date(new Date().setDate(new Date().getDate() + 5)) // Fallback 5 days if missing
      }));

      setUserTrips(formattedTrips);

      // --- LOGIC: Set Initial Active Tab ---
      // 1. Check if ANY trip is currently active
      const now = new Date();
      const hasActive = formattedTrips.some(t => t.start <= now && t.end >= now);

      if (hasActive) {
        setActiveTab('Active');
      } else {
        // Default to Upcoming
        setActiveTab('Upcoming');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- ANIMATION LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // --- FILTER TRIPS ---
  const filteredTrips = userTrips.filter(trip => {
    const now = new Date();
    // Normalize "now" to start of day for cleaner comparison
    now.setHours(0, 0, 0, 0);
    const start = new Date(trip.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(trip.end);
    end.setHours(23, 59, 59, 999);

    if (activeTab === 'Active') {
      return start <= now && end >= now;
    } else if (activeTab === 'Upcoming') {
      return start > now;
    } else {
      // Past
      return end < now;
    }
  });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {/* --- 3-WAY TOGGLE --- */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'Active' && styles.activeToggleButton]}
            onPress={() => setActiveTab('Active')}>
            <ThemedText style={[styles.toggleText, activeTab === 'Active' && styles.activeToggleText]}>
              Active
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'Upcoming' && styles.activeToggleButton]}
            onPress={() => setActiveTab('Upcoming')}>
            <ThemedText style={[styles.toggleText, activeTab === 'Upcoming' && styles.activeToggleText]}>
              Upcoming
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {filteredTrips.length === 0 ? (
            /* --- EMPTY STATE --- */
            <View style={styles.emptyStateContainer}>
              <View style={styles.heroContainer}>
                {HERO_IMAGES.map((image, index) => (
                  <HeroImageCard
                    key={index}
                    image={image}
                    index={index}
                    activeImageIndex={activeImageIndex}
                  />
                ))}
              </View>
              <ThemedText type="title" style={styles.heroTitle}>
                {activeTab === 'Active' ? "No active trip" : "No trips found"}
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                {activeTab === 'Active'
                  ? "You aren't on the road right now. Check Upcoming!"
                  : "Time to plan your next adventure."}
              </ThemedText>

              {/* Only show Create button if NOT in Past tab (optional UX choice) */}
              {activeTab !== 'Past' && (
                <TouchableOpacity
                  style={[styles.ctaButton, { backgroundColor: colors.tint }]}
                  onPress={() => router.push('/create-trip')}
                  activeOpacity={0.8}>
                  <ThemedText style={styles.ctaButtonText}>Plan a new trip</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* --- LIST STATE --- */
            <View style={styles.listContainer}>
              {filteredTrips.map((trip, index) => (
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
                    <Image source={{ uri: trip.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.cardOverlay}
                    />

                    <View style={styles.cardTopRow}>
                      <View>
                        {/* Optional: Add "Active" badge if needed */}
                        {activeTab === 'Active' && (
                          <View style={styles.activeBadge}>
                            <ThemedText style={styles.activeBadgeText}>LIVE</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={styles.budgetBadge}>
                        <ThemedText style={styles.budgetText}>${trip.totalBudget || trip.budget || 0}</ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardBottomContent}>
                      <View>
                        <ThemedText style={styles.dateText}>{trip.formattedStartDate} - {trip.formattedEndDate}</ThemedText>
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
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 }, // Centered Header

  // Updated Toggle Container
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 30, padding: 4 },
  toggleButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24 }, // Slightly less padding to fit 3 items
  activeToggleButton: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 13, color: '#808080', fontFamily: Fonts.medium },
  activeToggleText: { color: '#000' },

  scrollContent: { flexGrow: 1 },

  // Empty State
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingBottom: 100 },
  heroContainer: { width: 250, height: 320, marginBottom: 10, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroImageWrapper: { position: 'absolute', width: 240, height: 280, borderRadius: 24, overflow: 'hidden', borderWidth: 6, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  heroImage: { width: '100%', height: '100%' },
  heroTitle: { fontSize: 28, textAlign: 'center', marginBottom: 10, fontFamily: Fonts.bold },
  heroSubtitle: { fontSize: 16, textAlign: 'center', color: '#808080', marginBottom: 40, lineHeight: 24 },
  ctaButton: { width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  ctaButtonText: { color: '#fff', fontSize: 18, fontFamily: Fonts.bold },

  // List State
  listContainer: { paddingHorizontal: 20, gap: 20 },
  immersiveCard: { height: 220, borderRadius: 24, overflow: 'hidden', justifyContent: 'space-between', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, backgroundColor: '#333' },
  cardOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff' },
  budgetText: { color: '#000', fontSize: 13, fontWeight: 'bold' },
  cardBottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dateText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4, fontWeight: '500' },
  destinationTitle: { color: '#fff', fontSize: 24, fontFamily: Fonts.bold, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  // New Active Badge
  activeBadge: { backgroundColor: '#4CD964', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});