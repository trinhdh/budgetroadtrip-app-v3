import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

// --- GESTURE HANDLER ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// --- INTERNAL IMPORTS ---
import { Trip, TripMember } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { TripService } from '@/services/trip-service';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- TYPES FOR UI ---
interface UiTrip extends Trip {
  formattedStartDate: string;
  formattedEndDate: string;
  start: Date;
  end: Date;
}

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

// --- HELPER COMPONENT: AVATAR STACK ---
const MemberAvatarStack = ({ members }: { members: TripMember[] }) => {
  // Only show up to 3 avatars
  const displayMembers = members.slice(0, 3);
  const remainingCount = members.length - 3;

  return (
    <View style={styles.avatarStack}>
      {displayMembers.map((member, index) => (
        <Image
          key={member.uid || index}
          source={{ uri: member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random` }}
          style={[
            styles.stackAvatar,
            {
              zIndex: 10 - index,
              marginLeft: index > 0 ? -12 : 0 // Overlap effect
            }
          ]}
          contentFit="cover"
        />
      ))}

      {remainingCount > 0 && (
        <View style={[styles.moreBadge, { marginLeft: -12, zIndex: 0 }]}>
          <ThemedText style={styles.moreText}>+{remainingCount}</ThemedText>
        </View>
      )}
    </View>
  );
};

// --- 2. SWIPEABLE TRIP CARD COMPONENT ---
const TripCard = ({
  trip,
  router,
  currentUserId,
  onDelete,
  onShare
}: {
  trip: UiTrip,
  router: any,
  currentUserId?: string,
  onDelete: (id: string) => void,
  onShare: (trip: UiTrip) => void
}) => {

  const isOwner = trip.userId === currentUserId;
  const hasMultipleMembers = trip.members && trip.members.length > 1;
  const renderRightActions = (_progress: any, _dragX: any) => {
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007AFF', marginRight: 8 }]}
          onPress={() => onShare(trip)}
        >
          <IconSymbol name="square.and.arrow.up" size={26} color="#fff" />
          <ThemedText style={styles.actionTitle}>Invite</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          onPress={confirmDelete}
        >
          <IconSymbol name="trash.fill" size={26} color="#fff" />
          <ThemedText style={styles.actionTitle}>
            {isOwner ? "Delete" : "Leave"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const confirmDelete = () => {
    if (!trip.id) return;

    const title = isOwner ? "Delete Trip?" : "Leave Trip?";
    const message = isOwner
      ? "This action cannot be undone. All data will be lost."
      : "You will be removed from this trip.";

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isOwner ? "Delete" : "Leave",
          style: "destructive",
          onPress: () => onDelete(trip.id!)
        }
      ]
    );
  };

  const imageUrl = trip.image && trip.image.length > 0
    ? trip.image
    : `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop`;

  return (
    <ReanimatedSwipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={80}
      renderRightActions={renderRightActions}
      containerStyle={styles.swipeContainer}
    >
      <TouchableOpacity
        style={styles.immersiveCard}
        activeOpacity={0.95}
        onPress={() => router.push({
          pathname: '/trip-details/[id]',
          params: { id: trip.id }
        })}
      >
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={500}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardOverlay}
        />

        <View style={styles.cardTopRow}>
          {/* LEFT SIDE: Avatars OR Joined Badge OR Empty */}
          {hasMultipleMembers ? (
            <MemberAvatarStack members={trip.members} />
          ) : !isOwner ? (
            <View style={styles.joinedBadge}>
              <IconSymbol name="person.2.fill" size={14} color="#fff" />
              <ThemedText style={styles.joinedText}>Joined</ThemedText>
            </View>
          ) : (
            <View /> // Spacer if owner and alone
          )}

          <View style={styles.budgetBadge}>
            <ThemedText style={styles.budgetText}>
              ${Math.round(trip.estimatedCost > 0 ? trip.estimatedCost : trip.budget)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardBottomContent}>
          <View style={styles.cardTextContainer}>
            <ThemedText style={styles.dateText}>
              {trip.formattedStartDate} - {trip.formattedEndDate}
            </ThemedText>
            <ThemedText style={styles.destinationTitle} numberOfLines={2} ellipsizeMode="tail">
              {trip.destination}
            </ThemedText>
          </View>

          <View style={styles.arrowButton}>
            <IconSymbol name="chevron.right" size={20} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

// --- 3. MAIN SCREEN ---
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'Past'>('Upcoming');
  const [userTrips, setUserTrips] = useState<UiTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // --- FETCH TRIPS ---
  useEffect(() => {
    if (!user) return;

    const unsubscribe = TripService.subscribeToUserTrips(user.uid, (trips: Trip[]) => {

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      const formattedTrips: UiTrip[] = trips.map((trip) => {
        const startDateObj = trip.startDate ? new Date(trip.startDate) : new Date();

        let endDateObj: Date;
        if (trip.endDate) {
          endDateObj = new Date(trip.endDate);
        } else {
          endDateObj = new Date(startDateObj);
          endDateObj.setDate(startDateObj.getDate() + (trip.duration - 1));
        }

        return {
          ...trip,
          start: startDateObj,
          end: endDateObj,
          formattedStartDate: formatDate(startDateObj),
          formattedEndDate: formatDate(endDateObj),
        };
      });

      setUserTrips(formattedTrips);

      // --- AUTO SWITCH TO ACTIVE TAB (FIXED) ---
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize 'now' to start of day

      const hasActive = formattedTrips.some(t => {
        const start = new Date(t.start);
        start.setHours(0, 0, 0, 0);

        const end = new Date(t.end);
        end.setHours(23, 59, 59, 999); // Normalize 'end' to end of day

        return start <= now && end >= now;
      });

      if (hasActive) {
        setActiveTab('Active');
      }
      // ----------------------------------------

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

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await TripService.deleteTrip(tripId);
    } catch (error) {
      Alert.alert("Error", "Failed to delete trip.");
    }
  };

  const handleShareTrip = async (trip: UiTrip) => {
    try {
      const deepLink = `budgetroadtrip://trip-details/${trip.id}`;
      const message = `👋 You've been invited to join a trip to ${trip.destination}! 🌍\n\n📅 Dates: ${trip.formattedStartDate} - ${trip.formattedEndDate}\n\nTap the link below to view the itinerary and collaborate:\n${deepLink}`;

      await Share.share({
        message: message,
        title: `Trip Invitation: ${trip.destination}`,
        url: deepLink,
      });
    } catch (error: any) {
      Alert.alert("Share Error", error.message);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredTrips = userTrips.filter(trip => {
    const now = new Date();
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
      return end < now;
    }
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>

        {/* TABS */}
        <View style={styles.header}>
          <View style={styles.toggleContainer}>
            {(['Active', 'Upcoming', 'Past'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.toggleButton, activeTab === tab && styles.activeToggleButton]}
                onPress={() => setActiveTab(tab)}>
                <ThemedText style={[styles.toggleText, activeTab === tab && styles.activeToggleText]}>
                  {tab}
                </ThemedText>
              </TouchableOpacity>
            ))}
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
              <View style={styles.listContainer}>
                {filteredTrips.map((trip, index) => (
                  <Animated.View
                    key={trip.id}
                    entering={FadeInDown.delay(index * 100).springify()}
                  >
                    <TripCard
                      trip={trip}
                      router={router}
                      currentUserId={user?.uid}
                      onDelete={handleDeleteTrip}
                      onShare={handleShareTrip}
                    />
                  </Animated.View>
                ))}
                <View style={{ height: 100 }} />
              </View>
            )}
          </ScrollView>
        )}
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 30, padding: 4 },
  toggleButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24 },
  activeToggleButton: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 13, color: '#808080', fontFamily: Fonts.medium },
  activeToggleText: { color: '#000' },

  scrollContent: { flexGrow: 1 },

  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingBottom: 100 },
  heroContainer: { width: 250, height: 320, marginBottom: 10, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroImageWrapper: { position: 'absolute', width: 240, height: 280, borderRadius: 24, overflow: 'hidden', borderWidth: 6, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  heroImage: { width: '100%', height: '100%' },
  heroTitle: { fontSize: 28, textAlign: 'center', marginBottom: 10, fontFamily: Fonts.bold },
  heroSubtitle: { fontSize: 16, textAlign: 'center', color: '#808080', marginBottom: 40, lineHeight: 24 },
  ctaButton: { width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  ctaButtonText: { color: '#fff', fontSize: 18, fontFamily: Fonts.bold },

  listContainer: { paddingHorizontal: 20, gap: 20 },

  swipeContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  actionsContainer: {
    flexDirection: 'row',
    width: 170,
    paddingLeft: 10,
    height: '100%',
    alignItems: 'center',
  },
  actionButton: {
    width: 75,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.bold
  },

  immersiveCard: { height: 220, borderRadius: 24, overflow: 'hidden', justifyContent: 'space-between', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, backgroundColor: '#333' },
  cardOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },

  budgetBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff' },
  budgetText: { color: '#000', fontSize: 13, fontFamily: Fonts.bold },

  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#5856D6'
  },
  joinedText: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold },

  // --- AVATAR STACK STYLES ---
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4, // slight offset for the first avatar
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ddd',
  },
  moreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },

  cardBottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardTextContainer: { flex: 1, paddingRight: 12 },
  dateText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
  destinationTitle: { color: '#fff', fontSize: 24, fontFamily: Fonts.bold, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
});